-- supabase/migrations/20260409_oauth_rate_limit_buckets.sql
-- Adds OAuth-specific rate limit buckets to protect against button spam and
-- synthetic account creation (MAU inflation).
--
-- ── Customization ─────────────────────────────────────────────────────────
--   oauth_initiate : max Google OAuth redirect initiations per IP per 5 min
--                    → raise if real users hit this on shared IPs (e.g. offices)
--   oauth_signup   : max new OAuth accounts created per IP per hour
--                    → lower to harden against determined human farms
-- ──────────────────────────────────────────────────────────────────────────

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
    WHEN 'qr_generate'       THEN v_max := 10;  v_window := 60;
    WHEN 'user_qr_generate'  THEN v_max := 10;  v_window := 60;
    WHEN 'qr_scan'           THEN v_max := 60;  v_window := 60;
    WHEN 'login'             THEN v_max := 5;   v_window := 300;
    WHEN 'login_ip'          THEN v_max := 20;  v_window := 300;
    WHEN 'signup'            THEN v_max := 3;   v_window := 3600;
    WHEN 'username_check'    THEN v_max := 30;  v_window := 60;
    WHEN 'org_upgrade'       THEN v_max := 3;   v_window := 90000;  -- 25h window
    WHEN 'send_email'        THEN v_max := 30;  v_window := 60;
    WHEN 'password_reset'    THEN v_max := 3;   v_window := 3600;
    -- ── OAuth buckets ─────────────────────────────────────────────────────
    WHEN 'oauth_initiate'    THEN v_max := 10;  v_window := 300;   -- 10 / 5 min / IP
    WHEN 'oauth_signup'      THEN v_max := 3;   v_window := 3600;  -- 3 / hour / IP
    -- ──────────────────────────────────────────────────────────────────────
    ELSE RETURN false;  -- unknown bucket → deny
  END CASE;

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

-- Re-apply grants (CREATE OR REPLACE drops them)
REVOKE EXECUTE ON FUNCTION check_rate_limit(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION check_rate_limit(text, text) TO service_role;
