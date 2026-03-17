-- Fix: manual_checkin() now enforces chapter ownership for chapter_officer role
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
  SET total_points = total_points + v_event.points_value
  WHERE id = v_reg.user_id;

  RETURN json_build_object(
    'success',        true,
    'member_name',    v_profile.full_name,
    'points_awarded', v_event.points_value
  );
END;
$$;
