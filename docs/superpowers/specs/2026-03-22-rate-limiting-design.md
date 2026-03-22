# Rate Limiting & Abuse Protection — Design Spec
**Date:** 2026-03-22
**Status:** Approved
**Branch:** security-hardening
**Priority order:** Edge function abuse → Credential stuffing → API scraping → Spam signups

---

## 1. Problem Statement

DEVCON+ is pre-launch with no rate limiting on edge functions or internal API calls. The points/rewards ecosystem is the highest-value abuse target — a bot flooding `generate-qr-token` or `award-points-on-scan` could extract data or manipulate point balances. Secondary concerns are credential stuffing on login, API scraping of jobs/events, and automated account creation.

---

## 2. Approach: Supabase-Native Rate Limiting (PostgreSQL + Edge Function middleware)

Chosen over Upstash Redis (overkill at MVP scale, new dependency) and Cloudflare WAF (IP-only, no per-user logic, requires paid plan).

**Key principle:** A single `check_rate_limit()` RPC acts as the enforcement gate. Every protected surface calls it first, before any business logic runs.

---

## 3. Database Layer

### Table: `rate_limit_log`

```sql
CREATE TABLE rate_limit_log (
  id          bigserial PRIMARY KEY,
  identifier  text NOT NULL,
  bucket      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limit_log ON rate_limit_log (identifier, bucket, created_at);
```

- `identifier`: scoped key — `"ip:1.2.3.4"`, `"user:uuid"`, `"email:foo@bar.com"`
- `bucket`: named surface — `"login"`, `"login_ip"`, `"signup"`, `"qr_generate"`, `"qr_scan"`, `"username_check"`, `"org_upgrade"`

### RPC: `check_rate_limit`

```sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier  text,
  p_bucket      text,
  p_max         integer,
  p_window_secs integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND bucket = p_bucket
    AND created_at > now() - (p_window_secs || ' seconds')::interval;

  IF v_count >= p_max THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_log (identifier, bucket) VALUES (p_identifier, p_bucket);
  RETURN true;
END;
$$;
```

- `SECURITY DEFINER` — callable with the anon key from edge functions
- Atomic read-then-insert within a single function call
- Returns `false` (blocked) or `true` (allowed)

### Cleanup: pg_cron

```sql
SELECT cron.schedule(
  'rate-limit-log-cleanup',
  '0 * * * *',
  $$DELETE FROM rate_limit_log WHERE created_at < now() - interval '24 hours'$$
);
```

Runs hourly. Keeps table small — all windows are ≤ 24h so older rows are never read.

---

## 4. Rate Limit Buckets

| Surface | Identifier | Bucket | Max | Window | HTTP Response |
|---|---|---|---|---|---|
| `generate-qr-token` | `user:{uid}` | `qr_generate` | 10 | 60s | 429 "Too many token requests" |
| `award-points-on-scan` | `user:{organizer_uid}` | `qr_scan` | 60 | 60s | 429 "Scan rate exceeded" |
| Sign in (per email) | `email:{email}` | `login` | 5 | 300s | 429 lockout message |
| Sign in (per IP) | `ip:{ip}` | `login_ip` | 20 | 300s | 429 IP-level block |
| Sign up | `ip:{ip}` | `signup` | 3 | 3600s | 429 "Too many accounts from this network" |
| Username check | `ip:{ip}` | `username_check` | 30 | 60s | 429 silent block |
| Organizer upgrade | `user:{uid}` | `org_upgrade` | 3 | 86400s | 429 "Daily limit reached" |

**Reasoning:**
- QR generate 10/min: generous for a member refreshing their ticket; bots will exceed instantly
- QR scan 60/min: ~1 scan/second — enough for a busy event check-in queue
- Login dual-key: email catches credential stuffing on one account; IP catches distributed spraying
- Signup 3/hr/IP: more than enough for any real user; stops account farms
- Username check: client already debounces at 400ms so 30/min is generous for humans
- Org upgrade 3/day: prevents organizer code brute-forcing

---

## 5. New Edge Function: `check-rate-limit`

A generic enforcer called by the client for surfaces that don't have their own edge function.

**Input:**
```typescript
{ bucket: 'login' | 'login_ip' | 'signup' | 'username_check' | 'org_upgrade' }
```

**Behavior:**
1. Authenticate caller via `Authorization: Bearer <JWT>`
2. Extract IP from `x-forwarded-for` / `x-real-ip` request headers
3. Determine identifier based on bucket:
   - `login`: `email:{email}` from request body
   - `login_ip` / `signup` / `username_check`: `ip:{ip}`
   - `org_upgrade`: `user:{uid}` from JWT
4. Call `check_rate_limit()` RPC with bucket-specific limits
5. Return `{ allowed: boolean, retryAfterSeconds?: number }`

**Response codes:**
- `200 { allowed: true }` — proceed
- `429 { allowed: false, retryAfterSeconds: N }` — blocked

---

## 6. Modified Edge Functions

### `generate-qr-token/index.ts`

Add at the top, immediately after auth check:

```typescript
const allowed = await supabase.rpc('check_rate_limit', {
  p_identifier: `user:${user.id}`,
  p_bucket: 'qr_generate',
  p_max: 10,
  p_window_secs: 60
})
if (!allowed.data) {
  return new Response(JSON.stringify({ error: 'Too many token requests. Please wait.' }), {
    status: 429, headers: corsHeaders
  })
}
```

### `award-points-on-scan/index.ts`

Add at the top, immediately after organizer role verification:

```typescript
const allowed = await supabase.rpc('check_rate_limit', {
  p_identifier: `user:${organizer.id}`,
  p_bucket: 'qr_scan',
  p_max: 60,
  p_window_secs: 60
})
if (!allowed.data) {
  return new Response(JSON.stringify({ error: 'Scan rate exceeded. Slow down.' }), {
    status: 429, headers: corsHeaders
  })
}
```

---

## 7. Client-Side Changes

### `useAuthStore.ts` — `signIn()`

Before calling `supabase.auth.signInWithPassword()`:
1. Call `check-rate-limit` edge function with `bucket: 'login'` + email
2. Call `check-rate-limit` edge function with `bucket: 'login_ip'`
3. If either returns 429 → throw with lockout message + `retryAfterSeconds`
4. Existing logic proceeds unchanged

### `useAuthStore.ts` — `checkUsernameAvailable()`

Before the SELECT query:
1. Call `check-rate-limit` with `bucket: 'username_check'`
2. If blocked → return `null` (caller treats as "unavailable" — silent degradation)

### `useAuthStore.ts` — `requestOrganizerUpgrade()`

Before existing organizer code validation:
1. Call `check-rate-limit` with `bucket: 'org_upgrade'`
2. If blocked → throw "You've reached the daily limit for organizer code attempts"

### `SignIn.tsx` — client lockout upgrade

Keep existing `useRef` lockout as UX fast-path (avoids round trip for clearly locked-out users). Upgrade the lockout duration to match server: 5 attempts → 300s (5min) instead of current 30s. Display `retryAfterSeconds` from server response when server rejects.

---

## 8. Deliverables

| # | Artifact | Action |
|---|---|---|
| 1 | `supabase/migrations/YYYYMMDD_rate_limiting.sql` | New — table + RPC + pg_cron |
| 2 | `supabase/functions/check-rate-limit/index.ts` | New edge function |
| 3 | `supabase/functions/generate-qr-token/index.ts` | Modify — add RPC call at top |
| 4 | `supabase/functions/award-points-on-scan/index.ts` | Modify — add RPC call at top |
| 5 | `apps/member/src/stores/useAuthStore.ts` | Modify — signIn, checkUsernameAvailable, requestOrganizerUpgrade |
| 6 | `apps/member/src/pages/auth/SignIn.tsx` | Modify — upgrade client lockout duration |

---

## 9. Out of Scope (Deferred)

- Cloudflare Turnstile CAPTCHA on signup (deferred — under development)
- Upstash Redis migration (revisit at scale)
- Cloudflare WAF layer (future addition on top)
- Rate limiting on read-only data endpoints (events, jobs, news) — Supabase's built-in connection pooling handles scraping risk at MVP scale

---

## 10. Security Properties

- **No single point of bypass:** Dual-key login (email + IP) means rotating one doesn't help
- **Edge function abuse hardened first:** QR token + scan limits protect the points ecosystem before any other surface
- **Atomic enforcement:** `check_rate_limit()` reads and inserts in one function call — no TOCTOU race
- **Fail closed on edge functions:** 429 returned on any RPC error (explicit error handling)
- **Fail open on client rate limit check:** If `check-rate-limit` edge function is unreachable, `signIn()` proceeds — Supabase GoTrue is the final backstop
- **Table stays small:** pg_cron prunes hourly; max useful retention is 24h
