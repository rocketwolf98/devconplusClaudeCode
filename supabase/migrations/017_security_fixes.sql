-- ── Security fixes — applied after 016_profile_upgrades ─────────────────────

-- Fix 2: INSERT RLS policy on profiles
-- Without this, ensureProfile() is silently blocked (new sign-ups get no profile row)
-- and a crafty user could attempt to insert a row with an elevated role via the REST API.
CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'member');


-- Fix 3: SECURITY DEFINER RPC for approving organizer upgrades
-- Replaces direct anon-key UPDATE on another user's profile row from the browser,
-- which was blocked by RLS (only "update own profile" policy existed).
-- SECURITY DEFINER runs with the function owner's privileges, avoiding RLS recursion.
CREATE OR REPLACE FUNCTION approve_organizer_upgrade(
  p_user_id     uuid,
  p_role        text,
  p_chapter_id  uuid,
  p_request_id  uuid,
  p_reviewer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only allow promotable roles
  IF p_role NOT IN ('chapter_officer', 'hq_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Update the member's profile
  UPDATE profiles
  SET
    role               = p_role,
    chapter_id         = p_chapter_id,
    pending_role       = NULL,
    pending_chapter_id = NULL
  WHERE id = p_user_id;

  -- Mark the upgrade request as approved
  UPDATE organizer_upgrade_requests
  SET
    status      = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_organizer_upgrade TO authenticated;


-- Fix 4B: Atomic points increment for award-points-on-scan Edge Function
-- Replaces the read-modify-write pattern (read total_points, add, write back)
-- with a single in-place SQL update, eliminating lost-update race conditions.
CREATE OR REPLACE FUNCTION increment_member_points(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET total_points = total_points + p_amount
  WHERE id = p_user_id;
$$;

-- Only the service role (Edge Functions) should call this
GRANT EXECUTE ON FUNCTION increment_member_points TO service_role;
