-- supabase/migrations/20260414_reward_claim_workflow.sql

-- 1. Extend status check constraint to include 'cancelled'
ALTER TABLE reward_redemptions
  DROP CONSTRAINT IF EXISTS reward_redemptions_status_check,
  ADD CONSTRAINT reward_redemptions_status_check
    CHECK (status IN ('pending', 'claimed', 'cancelled'));

-- 2. Add organizer audit columns
ALTER TABLE reward_redemptions
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 3. RPC: approve_reward_claim
--    Guard: status must be 'pending'. Sets status='claimed', claimed_at, reviewed_by, reviewed_at.
CREATE OR REPLACE FUNCTION approve_reward_claim(
  p_redemption_id uuid,
  p_organizer_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_redemption reward_redemptions%ROWTYPE;
BEGIN
  -- Verify caller matches the organizer ID passed in
  IF auth.uid() IS DISTINCT FROM p_organizer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_redemption
    FROM reward_redemptions WHERE id = p_redemption_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  IF v_redemption.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim is not in pending state');
  END IF;

  UPDATE reward_redemptions SET
    status      = 'claimed',
    claimed_at  = now(),
    reviewed_by = p_organizer_id,
    reviewed_at = now()
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. RPC: refund_reward_claim
--    Guard: status must be 'pending'. Hard-errors on 'claimed' (cannot refund approved).
--    Restores spendable_points + inserts point_transaction in same transaction.
CREATE OR REPLACE FUNCTION refund_reward_claim(
  p_redemption_id uuid,
  p_organizer_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_redemption reward_redemptions%ROWTYPE;
  v_points_cost integer;
  v_reward_name text;
  v_ref text;
BEGIN
  -- Verify caller matches the organizer ID passed in
  IF auth.uid() IS DISTINCT FROM p_organizer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_redemption
    FROM reward_redemptions WHERE id = p_redemption_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  IF v_redemption.status = 'claimed' THEN
    RAISE EXCEPTION 'Cannot refund an already approved claim';
  END IF;

  IF v_redemption.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim already cancelled');
  END IF;

  SELECT points_cost, name INTO v_points_cost, v_reward_name
    FROM rewards WHERE id = v_redemption.reward_id;

  v_ref := upper(substring(gen_random_uuid()::text, 1, 8));

  -- Restore spendable points
  UPDATE profiles
    SET spendable_points = spendable_points + v_points_cost
  WHERE id = v_redemption.user_id;

  -- Insert audit transaction
  INSERT INTO point_transactions (user_id, amount, description, source, transaction_ref)
  VALUES (
    v_redemption.user_id,
    v_points_cost,
    'Reward refund: ' || v_reward_name,
    'redemption',
    v_ref
  );

  UPDATE reward_redemptions SET
    status      = 'cancelled',
    reviewed_by = p_organizer_id,
    reviewed_at = now()
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object('success', true, 'points_restored', v_points_cost);
END;
$$;
