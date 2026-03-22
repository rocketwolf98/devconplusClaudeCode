-- ═══════════════════════════════════════════════════════════════════════════
-- IDOR HARDENING MIGRATION
-- Spec: docs/superpowers/specs/2026-03-22-idor-hardening-design.md
-- Branch: security-hardening
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Fix C0: approve_organizer_upgrade — accept hq_admin + drop old overload ──
-- PostgreSQL identifies functions by name+params. The old 5-param version must
-- be explicitly dropped; CREATE OR REPLACE with a different param list creates
-- a new overload, it does NOT replace the original.

DROP FUNCTION IF EXISTS approve_organizer_upgrade(uuid, text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION approve_organizer_upgrade(
  p_request_id uuid,
  p_user_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_req         record;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT chapter_id, requested_role INTO v_req
  FROM organizer_upgrade_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already resolved';
  END IF;

  UPDATE profiles
  SET role               = v_req.requested_role,
      chapter_id         = COALESCE(v_req.chapter_id, chapter_id),
      pending_role       = NULL,
      pending_chapter_id = NULL
  WHERE id = p_user_id;

  UPDATE organizer_upgrade_requests
  SET status      = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_organizer_upgrade(uuid, uuid) TO authenticated;


-- ── Fix C1: Events DELETE — enforce chapter ownership ────────────────────────
DROP POLICY IF EXISTS "Officers can delete events" ON events;

CREATE POLICY "Officers can delete their chapter events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = events.chapter_id
        )
    )
  );


-- ── Fix C2: reject_organizer_upgrade — new SECURITY DEFINER RPC ──────────────
CREATE OR REPLACE FUNCTION reject_organizer_upgrade(
  p_request_id uuid,
  p_user_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET pending_role       = NULL,
      pending_chapter_id = NULL
  WHERE id = p_user_id;

  UPDATE organizer_upgrade_requests
  SET status      = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reject_organizer_upgrade(uuid, uuid) TO authenticated;


-- ── Fix C3: event_announcements — create table + RLS ─────────────────────────
CREATE TABLE IF NOT EXISTS event_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  organizer_id uuid REFERENCES profiles(id) NOT NULL,
  message      text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view announcements for their events"
  ON event_announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_registrations er
      WHERE er.event_id = event_announcements.event_id
        AND er.user_id  = auth.uid()
        AND er.status   = 'approved'
    )
  );

CREATE POLICY "Officers insert announcements for their chapter events"
  ON event_announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = NEW.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );

CREATE POLICY "Officers update announcements for their chapter events"
  ON event_announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_announcements.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = NEW.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );

CREATE POLICY "Officers delete announcements for their chapter events"
  ON event_announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_announcements.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );


-- ── Fix M1: admin_update_user_role — new SECURITY DEFINER RPC ────────────────
CREATE OR REPLACE FUNCTION admin_update_user_role(
  p_user_id  uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_new_role NOT IN ('member', 'chapter_officer', 'hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  IF p_new_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can grant super_admin role';
  END IF;

  UPDATE profiles SET role = p_new_role WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_role(uuid, text) TO authenticated;


-- ── Fix M2: event_registrations DELETE policies ───────────────────────────────
CREATE POLICY "Officers can delete registrations for their events"
  ON event_registrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_registrations.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );

CREATE POLICY "Members can delete own pending registrations"
  ON event_registrations FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );


-- ── Fix M3: volunteer_applications DELETE policy ──────────────────────────────
CREATE POLICY "Members can delete own pending volunteer applications"
  ON volunteer_applications FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );
