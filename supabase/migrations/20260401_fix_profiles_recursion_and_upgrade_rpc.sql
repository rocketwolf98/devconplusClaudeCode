-- ============================================================
-- Migration: fix_profiles_recursion_and_upgrade_rpc
--
-- Fixes three bugs:
--
-- A. Drop rogue RLS policies on profiles that cause infinite recursion.
--    "Admins view all profiles" calls get_my_role() which SELECTs from
--    profiles — creating a self-referencing loop. "Super admin can
--    update/delete any profile" subquery profiles → triggers the SELECT
--    policy → get_my_role() → infinite recursion (42P17).
--
--    Admin operations on profiles are handled by SECURITY DEFINER
--    functions (approve_organizer_upgrade, delete_own_account) which
--    bypass RLS. No admin-level RLS policies are needed on profiles.
--
-- B. Replace approve_organizer_upgrade: drop the 2-param version
--    (which is all that exists) and create the 5-param version that
--    the admin UI expects. The 20260323 migration was never applied.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- A. DROP ROGUE PROFILES POLICIES (cause infinite recursion)
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Super admin can delete any profile" ON profiles;


-- ════════════════════════════════════════════════════════════
-- B. REPLACE approve_organizer_upgrade (2-param → 5-param)
-- ════════════════════════════════════════════════════════════

-- Drop the existing 2-param version
DROP FUNCTION IF EXISTS approve_organizer_upgrade(uuid, uuid);

-- Create the 5-param version the admin UI calls
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
  -- Auth check: only hq_admin or super_admin can approve upgrades
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('hq_admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_role NOT IN ('chapter_officer', 'hq_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Update the user's profile: assign role + chapter, clear pending fields
  UPDATE profiles
  SET
    role               = p_role,
    chapter_id         = COALESCE(p_chapter_id, chapter_id),
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

GRANT EXECUTE ON FUNCTION approve_organizer_upgrade(uuid, text, uuid, uuid, uuid) TO authenticated;
