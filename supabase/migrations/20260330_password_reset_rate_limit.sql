-- supabase/migrations/20260330_password_reset_rate_limit.sql
--
-- Adds the 'password_reset' bucket to check_rate_limit.
-- Limit: 3 requests per email address per hour.
-- Keyed by email (not IP) to prevent a single attacker from flooding
-- one user's inbox from many IPs.
--
-- DEPLOY: supabase db push  (or paste into Supabase SQL editor)

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier  text,
  p_bucket      text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max    integer;
  v_window integer;  -- seconds
  v_count  integer;
BEGIN
  -- Hardcoded limits — changing these requires a new migration, not a client call
  CASE p_bucket
    WHEN 'qr_generate'    THEN v_max := 10;  v_window := 60;
    WHEN 'qr_scan'        THEN v_max := 60;  v_window := 60;
    WHEN 'login'          THEN v_max := 5;   v_window := 300;
    WHEN 'login_ip'       THEN v_max := 20;  v_window := 300;
    WHEN 'signup'         THEN v_max := 3;   v_window := 3600;
    WHEN 'username_check' THEN v_max := 30;  v_window := 60;
    WHEN 'org_upgrade'    THEN v_max := 3;   v_window := 90000;  -- 25h window
    WHEN 'password_reset' THEN v_max := 3;   v_window := 3600;   -- 3/hr per email
    ELSE RETURN false;  -- unknown bucket → deny
  END CASE;

  -- Serialize concurrent calls for the same (identifier, bucket) pair.
  PERFORM pg_advisory_xact_lock(hashtext(p_identifier || ':' || p_bucket));

  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND bucket     = p_bucket
    AND created_at > now() - (v_window || ' seconds')::interval;

  IF v_count >= v_max THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_log (identifier, bucket) VALUES (p_identifier, p_bucket);
  RETURN true;
END;
$$;

-- Re-apply permissions — OR REPLACE does not preserve them
REVOKE EXECUTE ON FUNCTION check_rate_limit(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION check_rate_limit(text, text) TO service_role;

-- SMOKE TEST (run in Supabase SQL editor after applying):
-- SELECT check_rate_limit('email:test@devcon.ph', 'password_reset');  -- true
-- SELECT check_rate_limit('email:test@devcon.ph', 'password_reset');  -- true
-- SELECT check_rate_limit('email:test@devcon.ph', 'password_reset');  -- true
-- SELECT check_rate_limit('email:test@devcon.ph', 'password_reset');  -- false (4th)
-- DELETE FROM rate_limit_log WHERE identifier = 'email:test@devcon.ph';
