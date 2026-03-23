-- ============================================================
-- Add volunteer_points to events + fix approve_volunteer_application RPC
-- Points awarded on volunteer approval = events.points_value + events.volunteer_points
-- ============================================================

-- 1. New column on events (default 500 matches DEFAULT_VOLUNTEER_POINTS in the frontend)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS volunteer_points integer NOT NULL DEFAULT 500;

-- 2. Replace the RPC so it reads points directly from the event row
--    instead of hardcoded local variables.
CREATE OR REPLACE FUNCTION approve_volunteer_application(
  p_application_id uuid,
  p_organizer_id   uuid
) RETURNS json AS $$
DECLARE
  v_app       volunteer_applications%ROWTYPE;
  v_event     events%ROWTYPE;
  v_organizer profiles%ROWTYPE;
  v_total     integer;
BEGIN
  -- 1. Verify caller identity — p_organizer_id must match the authenticated session user.
  --    SECURITY DEFINER bypasses RLS, so we enforce identity here explicitly.
  IF auth.uid() IS NULL OR auth.uid() != p_organizer_id THEN
    RETURN json_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  -- 2. Authorise caller role
  SELECT * INTO v_organizer FROM profiles WHERE id = p_organizer_id;
  IF v_organizer.role NOT IN ('chapter_officer', 'hq_admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 3. Lock the application row to prevent double-approval
  SELECT * INTO v_app
    FROM volunteer_applications
   WHERE id = p_application_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;
  IF v_app.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Already reviewed');
  END IF;

  -- 4. Fetch event to get both point values
  SELECT * INTO v_event FROM events WHERE id = v_app.event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- 5. Chapter scope check — chapter_officers may only approve for their own chapter
  IF v_organizer.role = 'chapter_officer' AND v_organizer.chapter_id != v_event.chapter_id THEN
    RETURN json_build_object('success', false, 'error', 'Not your chapter');
  END IF;

  -- Total = attendance points + volunteer bonus (both set by the organizer on event creation)
  v_total := v_event.points_value + v_event.volunteer_points;

  -- Mark approved
  UPDATE volunteer_applications
     SET status      = 'approved',
         reviewed_by = p_organizer_id,
         reviewed_at = now()
   WHERE id = p_application_id;

  -- Award points
  UPDATE profiles
     SET spendable_points = COALESCE(spendable_points, 0) + v_total,
         lifetime_points  = COALESCE(lifetime_points,  0) + v_total
   WHERE id = v_app.user_id;

  INSERT INTO point_transactions (user_id, amount, description, source)
  VALUES (v_app.user_id, v_total, 'Volunteer: ' || v_event.title, 'volunteering');

  RETURN json_build_object('success', true, 'points_awarded', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_volunteer_application(uuid, uuid) TO authenticated;
