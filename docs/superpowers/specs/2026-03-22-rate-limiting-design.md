# Rate Limiting & Abuse Protection — Design Spec
**Date:** 2026-03-22
**Status:** Approved (v3 — post spec-review round 2)
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

The function uses a **per-identifier advisory lock** (`pg_advisory_xact_lock`) to serialize concurrent calls for the same `(identifier, bucket)` pair, eliminating the TOCTOU race. Limits are **hardcoded inside the function** by bucket name — the caller cannot supply or override them.

```sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier  text,
  p_bucket      text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max    integer;
  v_window integer;
  v_count  integer;
BEGIN
  -- Hardcoded limits per bucket (client cannot override)
  CASE p_bucket
    WHEN 'qr_generate'    THEN v_max := 10;  v_window := 60;
    WHEN 'qr_scan'        THEN v_max := 60;  v_window := 60;
    WHEN 'login'          THEN v_max := 5;   v_window := 300;
    WHEN 'login_ip'       THEN v_max := 20;  v_window := 300;
    WHEN 'signup'         THEN v_max := 3;   v_window := 3600;
    WHEN 'username_check' THEN v_max := 30;  v_window := 60;
    WHEN 'org_upgrade'    THEN v_max := 3;   v_window := 90000; -- 25h window (see bucket table note)
    ELSE RETURN false; -- unknown bucket → deny
  END CASE;

  -- Serialize concurrent calls for this (identifier, bucket) pair
  PERFORM pg_advisory_xact_lock(hashtext(p_identifier || ':' || p_bucket));

  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND bucket = p_bucket
    AND created_at > now() - (v_window || ' seconds')::interval;

  IF v_count >= v_max THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_log (identifier, bucket) VALUES (p_identifier, p_bucket);
  RETURN true;
END;
$$;
```

**Key properties:**
- `SECURITY DEFINER` — callable with the anon key from edge functions
- Limits hardcoded by bucket — a client calling the RPC directly with `p_max: 999999` is impossible (those parameters don't exist)
- Advisory lock serializes only competing calls for the same `(identifier, bucket)` — no table-wide lock
- Unknown bucket → returns `false` (deny-by-default)
- Returns `false` (blocked) or `true` (allowed)

### Cleanup: pg_cron

```sql
SELECT cron.schedule(
  'rate-limit-log-cleanup',
  '0 * * * *',
  $$DELETE FROM rate_limit_log WHERE created_at < now() - interval '25 hours'$$
);
```

Runs hourly. Retention is **25 hours** (not 24) to add a safe margin over the longest window (`org_upgrade` at 25h). This prevents an off-by-one edge case where a cleanup run at an unlucky moment could delete rows still within an active window.

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
| Organizer upgrade | `user:{uid}` | `org_upgrade` | 3 | 90000s (25h) | 429 "Daily limit reached" |

**Reasoning:**
- QR generate 10/min: generous for a member refreshing their ticket; bots will exceed instantly
- QR scan 60/min: ~1 scan/second — enough for a busy event check-in queue
- Login dual-key: email catches credential stuffing on one account; IP catches distributed spraying
- Signup 3/hr/IP: more than enough for any real user; stops account farms
- Username check: client already debounces at 400ms so 30/min is generous for humans
- Org upgrade 3/day: prevents organizer code brute-forcing

**Known trade-off — login email key is user-supplied and unverified:** Because the user is unauthenticated at login time, an attacker could supply a victim's email to exhaust their `login` bucket (DoS on that account). This is accepted for MVP: the `login_ip` bucket limits the attacker's own throughput, and Supabase GoTrue is the final backstop. A future mitigation would be to count only *failed* login attempts rather than all attempts.

---

## 5. New Edge Function: `check-rate-limit`

A generic enforcer called by the **client** for surfaces without their own edge function. It is intentionally split into two auth modes based on bucket type.

### Input

```typescript
// For IP-keyed buckets (no user session required):
{ bucket: 'login' | 'login_ip' | 'signup' | 'username_check', email?: string }

// For user-keyed buckets (requires valid JWT):
{ bucket: 'org_upgrade' }
```

`email` is required when `bucket === 'login'` and is used only as the identifier — it is never stored or validated against auth state.

### Auth split

| Bucket | Auth required | Identifier source |
|---|---|---|
| `login` | Anon key only | `email:{email}` from request body |
| `login_ip` | Anon key only | `ip:{ip}` from request headers |
| `signup` | Anon key only | `ip:{ip}` from request headers |
| `username_check` | Anon key only | `ip:{ip}` from request headers |
| `org_upgrade` | Valid user JWT | `user:{uid}` from JWT |

The function checks whether a JWT is present and valid only for the `org_upgrade` bucket. For all other buckets it proceeds with the anon role — this is intentional and safe because the identifier is IP-based, not user-based.

### IP extraction

Extract the **last non-private IP** from the `x-forwarded-for` header chain. This prevents IP spoofing via a client-controlled first entry:

```typescript
function extractIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? ''
  const ips = xff.split(',').map(s => s.trim()).filter(Boolean)
  // Take the rightmost IP that is not a private/loopback address
  const privateRanges = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1)/
  const publicIp = [...ips].reverse().find(ip => !privateRanges.test(ip))
  return publicIp ?? ips[0] ?? 'unknown'
}
```

If no valid IP can be extracted, fall back to `'unknown'` — all unknown-IP requests share one bucket (effectively a global IP limit for requests missing headers). Note: if a misconfigured proxy strips all headers for a surge of real users, the `signup` bucket keyed to `ip:unknown` would hit its 3/hour limit and block all unknown-IP signups globally — acceptable for MVP.

**IPv6 private ranges:** The `privateRanges` regex must also cover `fe80:` (link-local) and `fc`/`fd` prefixes (unique local, RFC 4193). Extend the regex to include `|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:` to handle dual-stack infrastructure correctly.

### Response

```typescript
// Allowed:
{ allowed: true }

// Blocked:
{ allowed: false, retryAfterSeconds: number }
```

**`retryAfterSeconds` calculation:** Query the oldest log row within the active window for this `(identifier, bucket)` pair, then compute `ceil(window_seconds - age_of_oldest_row_in_seconds)`. This gives the exact time until the window slides enough to allow the next request.

**Response codes:**
- `200 { allowed: true }` — proceed
- `429 { allowed: false, retryAfterSeconds: N }` — blocked
- `500` on RPC error → edge function returns `{ allowed: false, retryAfterSeconds: 60 }` (fail closed for edge function surfaces; fail open for client surfaces — see Section 7)

---

## 6. Modified Edge Functions

Both existing edge functions call `check_rate_limit()` via the Supabase client **immediately after auth/role verification** and before any business logic. On RPC error, they **fail closed** (return 429) — edge functions protect the points ecosystem and must not degrade silently.

### `generate-qr-token/index.ts`

```typescript
// After auth check, before existing logic:
const { data: allowed, error: rlError } = await supabase.rpc('check_rate_limit', {
  p_identifier: `user:${user.id}`,
  p_bucket: 'qr_generate'
})
if (rlError || !allowed) {
  return new Response(JSON.stringify({ error: 'Too many token requests. Please wait.' }), {
    status: 429, headers: corsHeaders
  })
}
```

### `award-points-on-scan/index.ts`

```typescript
// After organizer role verification, before existing logic:
const { data: allowed, error: rlError } = await supabase.rpc('check_rate_limit', {
  p_identifier: `user:${organizer.id}`,
  p_bucket: 'qr_scan'
})
if (rlError || !allowed) {
  return new Response(JSON.stringify({ error: 'Scan rate exceeded. Slow down.' }), {
    status: 429, headers: corsHeaders
  })
}
```

**Note:** The scan bucket does not prevent a single QR token from being scanned by multiple different organizers (each has their own 60/min budget). Double-award protection is handled by the existing atomic `checked_in = false` guard in the business logic — that remains the authoritative defence.

---

## 7. Client-Side Changes

### `useAuthStore.ts` — `signIn()`

Before calling `supabase.auth.signInWithPassword()`:
1. Call `check-rate-limit` with `{ bucket: 'login', email }` (anon key, no JWT)
2. Call `check-rate-limit` with `{ bucket: 'login_ip' }` (anon key, no JWT)
3. If either returns `429` → throw with lockout message and surface `retryAfterSeconds` to the UI
4. If `check-rate-limit` is unreachable → **fail open** (proceed to GoTrue, which is the final backstop)

### `useAuthStore.ts` — `checkUsernameAvailable()`

Before the SELECT query:
1. Call `check-rate-limit` with `{ bucket: 'username_check' }` (anon key)
2. If blocked → return `null` (caller treats as unavailable — silent degradation, no error shown)
3. If unreachable → fail open (proceed with query)

### `useAuthStore.ts` — `requestOrganizerUpgrade()`

Before existing organizer code validation:
1. Call `check-rate-limit` with `{ bucket: 'org_upgrade' }` (user JWT required)
2. If blocked → throw "You've reached the daily limit for organizer code attempts. Try again tomorrow."
3. If unreachable → fail open (proceed; GoTrue + RLS are the final backstop)

### `SignIn.tsx` — client lockout upgrade

Keep existing `useRef` lockout as UX fast-path (avoids a round trip for clearly locked-out users). Upgrade to match server limits:
- 5 attempts → 300s (5 min) instead of current 30s
- Display `retryAfterSeconds` from the server's `429` response in the existing countdown timer when the server rejects before client lockout triggers

---

## 8. Signup Rate Limit — Advisory Only

The `signup` IP limit is enforced client-side (in `useAuthStore.signUp()` via `check-rate-limit`). Because `supabase.auth.signUp()` is a direct GoTrue call, a client bypassing the React app entirely could create accounts without hitting the rate limit function. This is an accepted MVP limitation.

Cloudflare Turnstile (deferred) would close this gap at the infrastructure level. Until then, the signup limit is a deterrent for casual abuse only — not a hard infrastructure enforcement.

This is explicitly stated so it does not mislead future reviewers.

---

## 9. Deliverables

| # | Artifact | Action |
|---|---|---|
| 1 | `supabase/migrations/YYYYMMDD_rate_limiting.sql` | New — table + RPC + pg_cron |
| 2 | `supabase/functions/check-rate-limit/index.ts` | New edge function |
| 3 | `supabase/functions/generate-qr-token/index.ts` | Modify — add RPC call after auth check |
| 4 | `supabase/functions/award-points-on-scan/index.ts` | Modify — add RPC call after role check |
| 5 | `apps/member/src/stores/useAuthStore.ts` | Modify — signIn, checkUsernameAvailable, requestOrganizerUpgrade |
| 6 | `apps/member/src/pages/auth/SignIn.tsx` | Modify — upgrade client lockout to 300s, show server retryAfterSeconds |

---

## 10. Out of Scope (Deferred)

- Cloudflare Turnstile CAPTCHA on signup (deferred — under development; would close the signup advisory-only gap)
- Upstash Redis migration (revisit at scale)
- Cloudflare WAF layer (future addition on top)
- Rate limiting on read-only data endpoints (events, jobs, news) — Supabase's built-in connection pooling handles scraping risk at MVP scale
- Counting only failed login attempts (future hardening of the login email-key DoS trade-off)

---

## 11. Implementation Notes

- **`hashtext()` collision:** The advisory lock uses a 32-bit hash — two distinct `(identifier, bucket)` strings could theoretically share a lock. At MVP scale this is negligible and causes unnecessary serialization at worst (not incorrect behavior).
- **`SECURITY DEFINER` + RLS:** `rate_limit_log` intentionally has **no RLS policy**. The function runs as owner and bypasses RLS — this is deliberate; the table stores no user-sensitive data.
- **`Retry-After` header:** The 429 response should include both the JSON body `retryAfterSeconds` and the `Retry-After: <seconds>` HTTP header per RFC 7231 — zero extra cost, benefits HTTP clients that respect it.

---

## 12. Security Properties

- **No single point of bypass:** Dual-key login (email + IP) means rotating one doesn't help
- **Edge function abuse hardened first:** QR token + scan limits protect the points ecosystem before any other surface
- **Atomic enforcement:** Advisory lock on `(identifier, bucket)` hash eliminates TOCTOU race without a table-wide lock
- **Client cannot override limits:** `p_max` and `p_window_secs` removed from public RPC — limits are hardcoded by bucket name inside the function
- **Auth split is correct:** IP-keyed buckets work pre-auth (anon key); user-keyed buckets require JWT
- **IP extraction is spoof-resistant:** Rightmost non-private IP from `x-forwarded-for` chain, not the client-controlled first entry
- **Fail closed on edge functions:** 429 returned on any RPC error — points ecosystem is never degraded silently
- **Fail open on client surfaces:** If `check-rate-limit` is unreachable, GoTrue + RLS are the final backstop
- **Table stays small:** pg_cron prunes hourly at 25h retention; max useful window is 25h (org_upgrade)
- **Double-award protection is not rate-limit's job:** The existing `checked_in` atomic guard handles that; the scan rate limit is a separate layer
