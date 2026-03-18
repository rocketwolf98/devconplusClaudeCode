-- ============================================================
-- Migration: 20260318_rewards_engine
-- Description: Dual-balance points, volunteer applications,
--              referral system, rewards redemption RPC
-- Run order: after 20260316_fix_manual_checkin_chapter_scope.sql
-- ============================================================


-- ============================================================
-- 3a. Profiles table changes + CHECK constraint update
-- ============================================================

-- Rename total_points → spendable_points
ALTER TABLE profiles RENAME COLUMN total_points TO spendable_points;

-- Add lifetime_points (initialize from spendable_points for existing users)
ALTER TABLE profiles ADD COLUMN lifetime_points integer DEFAULT 0;
UPDATE profiles SET lifetime_points = COALESCE(spendable_points, 0);

-- Add referral_code
ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
UPDATE profiles SET referral_code = upper(substring(gen_random_uuid()::text, 1, 8))
  WHERE referral_code IS NULL;

-- Trigger: auto-generate referral_code on new profile INSERT
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := upper(substring(gen_random_uuid()::text, 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_referral_code ON profiles;
CREATE TRIGGER trg_profile_referral_code
BEFORE INSERT ON profiles
FOR EACH ROW WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION generate_referral_code();

-- Add 'referral' to point_transactions source CHECK constraint
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_source_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_source_check
  CHECK (source IN (
    'signup', 'event_attendance', 'brown_bag', 'speaking',
    'content_like', 'content_share', 'volunteering', 'redemption', 'bonus',
    'referral'
  ));


-- ============================================================
-- 3b. Replace handle_new_user trigger (fixes column rename)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, role, spendable_points, lifetime_points
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'member',
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Signup bonus trigger (replaces old 500pt award, now 100pts)
CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET spendable_points = COALESCE(spendable_points, 0) + 100,
      lifetime_points  = COALESCE(lifetime_points, 0)  + 100
  WHERE id = NEW.id;

  INSERT INTO public.point_transactions (user_id, amount, description, source)
  VALUES (NEW.id, 100, 'Welcome to DEVCON+!', 'signup');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_signup_bonus ON public.profiles;
CREATE TRIGGER trg_award_signup_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION award_signup_bonus();


-- ============================================================
-- 3c. Update rewards table + reseed catalog
-- ============================================================

ALTER TABLE rewards ADD COLUMN stock_remaining integer;
ALTER TABLE rewards ADD COLUMN max_per_user integer;
ALTER TABLE rewards ADD COLUMN financial_cost_php integer;

DELETE FROM reward_redemptions;
DELETE FROM rewards;
INSERT INTO rewards (name, description, points_cost, type, claim_method,
  stock_remaining, max_per_user, financial_cost_php, is_active, is_coming_soon) VALUES
  ('DEVCON Hoodie / Qtr Zip', 'Official DEVCON hoodie or quarter-zip jacket.',
    5000, 'physical', 'onsite', 15, 1, 800, true, false),
  ('Anniversary Shirt', 'Limited edition DEVCON anniversary shirt.',
    3500, 'physical', 'onsite', 20, 1, 500, true, false),
  ('DEVCON+ Special Kit', 'Curated DEVCON+ exclusive swag kit.',
    3500, 'physical', 'onsite', 16, NULL, 500, true, false);


-- ============================================================
-- 3d. New volunteer_applications table
-- ============================================================

CREATE TABLE volunteer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number text,
  social_media_handle text,
  reason text NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  applied_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  UNIQUE(event_id, user_id)
);

ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own volunteer applications"
  ON volunteer_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members insert own volunteer applications"
  ON volunteer_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Officers manage volunteer applications"
  ON volunteer_applications FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('chapter_officer','hq_admin','super_admin'))
  );


-- ============================================================
-- 3e. New referrals table
-- ============================================================

CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'confirmed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE(referred_user_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);


-- ============================================================
-- 3f. Update increment_member_points RPC
-- ============================================================

CREATE OR REPLACE FUNCTION increment_member_points(p_user_id uuid, p_amount integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET spendable_points = COALESCE(spendable_points, 0) + p_amount,
      lifetime_points  = COALESCE(lifetime_points, 0)  + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION increment_member_points(uuid, integer) TO service_role;


-- ============================================================
-- 3g. Patch manual_checkin RPC (replace total_points references)
-- ============================================================

-- Fix: manual_checkin() now enforces chapter ownership for chapter_officer role
-- AND uses spendable_points + lifetime_points instead of total_points
CREATE OR REPLACE FUNCTION manual_checkin(
  p_registration_id uuid,
  p_organizer_id    uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg       event_registrations%ROWTYPE;
  v_event     events%ROWTYPE;
  v_profile   profiles%ROWTYPE;
  v_organizer profiles%ROWTYPE;
BEGIN
  -- Verify organizer role
  SELECT * INTO v_organizer FROM profiles WHERE id = p_organizer_id;
  IF v_organizer.role NOT IN ('chapter_officer', 'hq_admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Get and lock registration row to prevent concurrent double-checkin
  SELECT * INTO v_reg FROM event_registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'registration_not_found');
  END IF;
  IF v_reg.status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'not_approved');
  END IF;
  -- Idempotency guard
  IF v_reg.checked_in IS TRUE THEN
    RETURN json_build_object('success', false, 'error', 'already_checked_in');
  END IF;

  SELECT * INTO v_event FROM events WHERE id = v_reg.event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Chapter ownership guard: chapter_officers may only check in members
  -- for events belonging to their own chapter.
  -- hq_admin and super_admin are exempt.
  IF v_organizer.role = 'chapter_officer'
     AND v_organizer.chapter_id IS DISTINCT FROM v_event.chapter_id
  THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized_chapter');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_reg.user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  -- Mark checked in
  UPDATE event_registrations SET checked_in = true WHERE id = p_registration_id;

  -- Award points
  INSERT INTO point_transactions (user_id, amount, description, source)
  VALUES (
    v_reg.user_id,
    v_event.points_value,
    'Attended: ' || v_event.title,
    'event_attendance'
  );

  UPDATE profiles
  SET spendable_points = COALESCE(spendable_points, 0) + v_event.points_value,
      lifetime_points  = COALESCE(lifetime_points, 0)  + v_event.points_value
  WHERE id = v_reg.user_id;

  RETURN json_build_object(
    'success',        true,
    'member_name',    v_profile.full_name,
    'points_awarded', v_event.points_value
  );
END;
$$;


-- ============================================================
-- 3h. New redeem_reward RPC
-- ============================================================

CREATE OR REPLACE FUNCTION redeem_reward(p_reward_id uuid, p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_reward rewards%ROWTYPE;
  v_user_balance integer;
  v_redemptions_this_year integer;
  v_redemption_id uuid;
BEGIN
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Reward not found'); END IF;
  IF NOT v_reward.is_active THEN RETURN json_build_object('success', false, 'error', 'Reward not available'); END IF;
  IF v_reward.stock_remaining IS NOT NULL AND v_reward.stock_remaining <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Out of stock');
  END IF;
  SELECT spendable_points INTO v_user_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_user_balance < v_reward.points_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  IF v_reward.max_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_redemptions_this_year
    FROM reward_redemptions
    WHERE user_id = p_user_id AND reward_id = p_reward_id
      AND EXTRACT(YEAR FROM redeemed_at) = EXTRACT(YEAR FROM now());
    IF v_redemptions_this_year >= v_reward.max_per_user THEN
      RETURN json_build_object('success', false, 'error', 'Annual limit reached');
    END IF;
  END IF;
  UPDATE profiles SET spendable_points = spendable_points - v_reward.points_cost WHERE id = p_user_id;
  IF v_reward.stock_remaining IS NOT NULL THEN
    UPDATE rewards SET stock_remaining = stock_remaining - 1 WHERE id = p_reward_id;
  END IF;
  INSERT INTO reward_redemptions (user_id, reward_id, status)
  VALUES (p_user_id, p_reward_id, 'pending') RETURNING id INTO v_redemption_id;
  INSERT INTO point_transactions (user_id, amount, description, source)
  VALUES (p_user_id, -v_reward.points_cost, 'Redeemed: ' || v_reward.name, 'redemption');
  RETURN json_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION redeem_reward(uuid, uuid) TO authenticated;


-- ============================================================
-- 3i. New approve_volunteer_application RPC
-- ============================================================

CREATE OR REPLACE FUNCTION approve_volunteer_application(
  p_application_id uuid,
  p_organizer_id uuid
) RETURNS json AS $$
DECLARE
  v_app volunteer_applications%ROWTYPE;
  v_event events%ROWTYPE;
  v_organizer profiles%ROWTYPE;
  v_event_attendance integer := 5;
  v_volunteer_bonus  integer := 30;
  v_total_points     integer;
BEGIN
  SELECT * INTO v_organizer FROM profiles WHERE id = p_organizer_id;
  IF v_organizer.role NOT IN ('chapter_officer','hq_admin','super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  SELECT * INTO v_app FROM volunteer_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Application not found'); END IF;
  IF v_app.status != 'pending' THEN RETURN json_build_object('success', false, 'error', 'Already reviewed'); END IF;
  SELECT * INTO v_event FROM events WHERE id = v_app.event_id;
  v_total_points := v_event_attendance + v_volunteer_bonus;
  UPDATE volunteer_applications SET status = 'approved', reviewed_by = p_organizer_id, reviewed_at = now() WHERE id = p_application_id;
  UPDATE profiles SET spendable_points = COALESCE(spendable_points, 0) + v_total_points, lifetime_points = COALESCE(lifetime_points, 0) + v_total_points WHERE id = v_app.user_id;
  INSERT INTO point_transactions (user_id, amount, description, source)
  VALUES (v_app.user_id, v_total_points, 'Volunteer: ' || v_event.title, 'volunteering');
  RETURN json_build_object('success', true, 'points_awarded', v_total_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION approve_volunteer_application(uuid, uuid) TO authenticated;


-- ============================================================
-- 3j. New confirm_referral function (idempotent)
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_referral(p_referral_code text, p_referred_user_id uuid)
RETURNS json AS $$
DECLARE
  v_referrer profiles%ROWTYPE;
  v_referral_pts_this_year integer;
  v_pts_to_award integer := 100;
  v_max_annual integer := 1000;
  v_rows_inserted integer;
BEGIN
  SELECT * INTO v_referrer FROM profiles WHERE referral_code = p_referral_code;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Invalid referral code'); END IF;
  IF v_referrer.id = p_referred_user_id THEN RETURN json_build_object('success', false, 'error', 'Cannot refer yourself'); END IF;
  INSERT INTO referrals (referrer_id, referred_user_id, status, confirmed_at)
  VALUES (v_referrer.id, p_referred_user_id, 'confirmed', now())
  ON CONFLICT (referred_user_id) DO NOTHING;
  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
  IF v_rows_inserted = 0 THEN
    RETURN json_build_object('success', true, 'points_awarded', 0);
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_referral_pts_this_year
  FROM point_transactions
  WHERE user_id = v_referrer.id AND source = 'referral'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  v_pts_to_award := GREATEST(0, LEAST(v_pts_to_award, v_max_annual - v_referral_pts_this_year));
  IF v_pts_to_award > 0 THEN
    UPDATE profiles SET spendable_points = COALESCE(spendable_points, 0) + v_pts_to_award, lifetime_points = COALESCE(lifetime_points, 0) + v_pts_to_award WHERE id = v_referrer.id;
    INSERT INTO point_transactions (user_id, amount, description, source)
    VALUES (v_referrer.id, v_pts_to_award, 'Referral reward', 'referral');
  END IF;
  RETURN json_build_object('success', true, 'points_awarded', v_pts_to_award);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION confirm_referral(text, uuid) TO authenticated;
