-- RPC: chapter officer approves a pending upgrade request (same-chapter only)
CREATE OR REPLACE FUNCTION officer_approve_upgrade(
  p_request_id uuid,
  p_reviewer_id uuid
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_request organizer_upgrade_requests%ROWTYPE;
  v_reviewer profiles%ROWTYPE;
BEGIN
  -- Load reviewer
  SELECT * INTO v_reviewer FROM profiles WHERE id = p_reviewer_id;
  IF v_reviewer.role NOT IN ('chapter_officer', 'hq_admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not an organizer');
  END IF;

  -- Load request
  SELECT * INTO v_request FROM organizer_upgrade_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed');
  END IF;

  -- Chapter boundary: reviewer must be in the same chapter as the request
  IF v_reviewer.chapter_id != v_request.chapter_id THEN
    RETURN json_build_object('success', false, 'error', 'Cross-chapter action not allowed');
  END IF;

  -- Promote the member: update profile role + chapter, clear pending fields
  UPDATE profiles
    SET role = v_request.requested_role,
        chapter_id = v_request.chapter_id,
        pending_role = NULL,
        pending_chapter_id = NULL
    WHERE id = v_request.user_id;

  -- Mark request as approved
  UPDATE organizer_upgrade_requests
    SET status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = now()
    WHERE id = p_request_id;

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: chapter officer demotes a co-organizer back to member (same-chapter only)
CREATE OR REPLACE FUNCTION officer_demote_coorganizer(
  p_target_id uuid,
  p_officer_id uuid
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_officer profiles%ROWTYPE;
  v_target  profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_officer FROM profiles WHERE id = p_officer_id;
  SELECT * INTO v_target  FROM profiles WHERE id = p_target_id;

  -- Caller must be an organizer
  IF v_officer.role NOT IN ('chapter_officer', 'hq_admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not an organizer');
  END IF;

  -- Cannot demote yourself
  IF p_officer_id = p_target_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot demote yourself');
  END IF;

  -- Chapter boundary: can only demote someone in the same chapter
  IF v_officer.chapter_id != v_target.chapter_id THEN
    RETURN json_build_object('success', false, 'error', 'Cross-chapter action not allowed');
  END IF;

  -- Cannot demote hq_admin or super_admin
  IF v_target.role IN ('hq_admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot demote admin roles');
  END IF;

  UPDATE profiles SET role = 'member' WHERE id = p_target_id;

  RETURN json_build_object('success', true);
END;
$$;
