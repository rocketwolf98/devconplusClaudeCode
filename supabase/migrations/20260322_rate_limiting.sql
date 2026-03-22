-- supabase/migrations/20260322_rate_limiting.sql

-- 1. Rate limit log table
--    No RLS — intentional, stores no user-sensitive data.
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          bigserial PRIMARY KEY,
  identifier  text NOT NULL,
  bucket      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log
  ON rate_limit_log (identifier, bucket, created_at);

-- 2. Grant anon SELECT so the check-rate-limit edge function can query oldest
--    in-window row for retryAfterSeconds calculation (uses anon client).
GRANT SELECT ON rate_limit_log TO anon;

-- 3. check_rate_limit RPC
--    Limits are hardcoded by bucket — the caller cannot override them.
--    Uses a per-(identifier,bucket) advisory lock to eliminate TOCTOU races.
--    Returns true (allowed) or false (blocked).
--    Unknown bucket → false (deny-by-default).
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier  text,
  p_bucket      text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
    ELSE RETURN false;  -- unknown bucket → deny
  END CASE;

  -- Serialize concurrent calls for the same (identifier, bucket) pair.
  -- pg_advisory_xact_lock auto-releases at transaction end — no manual unlock needed.
  -- 32-bit hash collision is possible but negligible at MVP scale (unnecessary
  -- serialization at worst, not incorrect behavior).
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

-- 4. Hourly cleanup — 25h retention (safe margin over the 25h org_upgrade window).
--    Prevents off-by-one where a cleanup run deletes rows still within an active window.
SELECT cron.schedule(
  'rate-limit-log-cleanup',
  '0 * * * *',
  $$DELETE FROM rate_limit_log WHERE created_at < now() - interval '25 hours'$$
);

-- SMOKE TEST (run in Supabase SQL editor after applying migration):
-- SELECT check_rate_limit('ip:1.2.3.4', 'signup');  -- true
-- SELECT check_rate_limit('ip:1.2.3.4', 'signup');  -- true
-- SELECT check_rate_limit('ip:1.2.3.4', 'signup');  -- true
-- SELECT check_rate_limit('ip:1.2.3.4', 'signup');  -- false (4th call, limit is 3)
-- SELECT check_rate_limit('ip:1.2.3.4', 'nonexistent_bucket');  -- false
-- DELETE FROM rate_limit_log WHERE identifier = 'ip:1.2.3.4';
