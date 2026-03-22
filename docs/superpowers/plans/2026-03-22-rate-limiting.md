# Rate Limiting & Abuse Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase-native rate limiting to all high-value surfaces — edge functions (QR token generation and scan), login, signup, username check, and organizer code submission — using a PostgreSQL `rate_limit_log` table and a `check_rate_limit()` SECURITY DEFINER RPC.

**Architecture:** A single `check_rate_limit(p_identifier, p_bucket)` RPC with hardcoded per-bucket limits acts as the enforcement gate. Two existing edge functions call it directly via the service-role client. A new `check-rate-limit` edge function acts as a generic enforcer for client-side surfaces. All rate limit state lives in Postgres; no new external services required.

**Tech Stack:** PostgreSQL (pg_cron, advisory locks), Supabase Edge Functions (Deno/TypeScript), React + Zustand (client-side enforcement), TypeScript strict mode

**Spec:** `docs/superpowers/specs/2026-03-22-rate-limiting-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `supabase/migrations/20260322_rate_limiting.sql` | Table, RPC, anon SELECT grant, pg_cron cleanup |
| **Create** | `supabase/functions/check-rate-limit/index.ts` | Generic client-facing rate limit enforcer |
| **Modify** | `supabase/functions/generate-qr-token/index.ts` | Add `qr_generate` check after service-role client, before body parse |
| **Modify** | `supabase/functions/award-points-on-scan/index.ts` | Add `qr_scan` check after organizer role check |
| **Modify** | `apps/member/src/stores/useAuthStore.ts` | Add `callRateLimit` helper; modify `signIn`, `signUp`, `checkUsernameAvailable`, `requestOrganizerUpgrade` |
| **Modify** | `apps/member/src/pages/auth/SignIn.tsx` | Upgrade client lockout 30s → 300s, surface server `retryAfterSeconds` |

---

## Task 1: Database migration — rate_limit_log table + check_rate_limit RPC + pg_cron

**Files:**
- Create: `supabase/migrations/20260322_rate_limiting.sql`

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Verify the SQL is syntactically valid**

Open the Supabase SQL editor (or run `supabase db push` locally if the CLI is configured).
Paste and execute the migration. Expected: no errors.

If `cron.schedule` errors with "extension not found", run first:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```
Then re-run the migration.

- [ ] **Step 3: Smoke-test the RPC**

In the Supabase SQL editor run each line separately:
```sql
-- Call 1: should return true
SELECT check_rate_limit('ip:1.2.3.4', 'signup');
-- Call 2: true
SELECT check_rate_limit('ip:1.2.3.4', 'signup');
-- Call 3: true (limit is 3 — this is the 3rd)
SELECT check_rate_limit('ip:1.2.3.4', 'signup');
-- Call 4: should return false (exceeded limit of 3)
SELECT check_rate_limit('ip:1.2.3.4', 'signup');
-- Unknown bucket: should return false immediately
SELECT check_rate_limit('ip:1.2.3.4', 'nonexistent_bucket');
```

Expected sequence: `true, true, true, false, false`

Clean up after test:
```sql
DELETE FROM rate_limit_log WHERE identifier = 'ip:1.2.3.4';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260322_rate_limiting.sql
git commit -m "feat(rate-limiting): add rate_limit_log table + check_rate_limit RPC + pg_cron cleanup"
```

---

## Task 2: New edge function — check-rate-limit

**Files:**
- Create: `supabase/functions/check-rate-limit/index.ts`

This function is the generic enforcer for client-side surfaces. It handles both pre-auth (anon key, IP-keyed buckets) and post-auth (JWT required, `org_upgrade` bucket) in one function.

**Important:** `req.json()` can only be consumed once per request. The body is parsed at the top of `Deno.serve` before any branching — do not add a second `req.json()` call anywhere in this file.

- [ ] **Step 1: Create the edge function file**

```typescript
// supabase/functions/check-rate-limit/index.ts
// Generic rate limit enforcer called by the client for surfaces without their own edge function.
//
// IP-keyed buckets (login, login_ip, signup, username_check): no JWT required
// User-keyed buckets (org_upgrade): valid JWT required
//
// Input:  { bucket: string, email?: string }
// Output: { allowed: boolean, retryAfterSeconds?: number }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Bucket = 'login' | 'login_ip' | 'signup' | 'username_check' | 'org_upgrade'
const IP_BUCKETS: Bucket[] = ['login', 'login_ip', 'signup', 'username_check']

// Window durations matching the check_rate_limit RPC CASE statement.
// Used only for retryAfterSeconds calculation — not for enforcement.
const WINDOW_MAP: Record<string, number> = {
  qr_generate:    60,
  qr_scan:        60,
  login:          300,
  login_ip:       300,
  signup:         3600,
  username_check: 60,
  org_upgrade:    90000,
}

// Extract the rightmost non-private IP from the x-forwarded-for chain.
// Rightmost = server-side proxy appended, not client-controlled.
// Covers IPv4 RFC 1918 ranges, IPv6 loopback, link-local (fe80:), unique local (fc/fd).
function extractIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? ''
  const ips = xff.split(',').map((s) => s.trim()).filter(Boolean)
  const privateRanges =
    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i
  const publicIp = [...ips].reverse().find((ip) => !privateRanges.test(ip))
  // 'unknown' fallback: all missing-header requests share one bucket (acceptable for MVP)
  return publicIp ?? ips[0] ?? 'unknown'
}

// Calculate how many seconds until the oldest in-window entry expires.
// Requires anon SELECT on rate_limit_log (granted in migration).
// On query error → falls back to full window duration.
async function calcRetryAfter(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  bucket: string
): Promise<number> {
  const window = WINDOW_MAP[bucket] ?? 60
  const { data } = await supabase
    .from('rate_limit_log')
    .select('created_at')
    .eq('identifier', identifier)
    .eq('bucket', bucket)
    .gt('created_at', new Date(Date.now() - window * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) return window
  const oldest = new Date(data.created_at).getTime()
  return Math.ceil(Math.max(0, oldest + window * 1000 - Date.now()) / 1000)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse body once — req.json() can only be consumed once per request
  const json: { bucket?: string; email?: string } = await req.json().catch(() => ({}))
  const bucket = json.bucket as Bucket | undefined

  if (!bucket) {
    return new Response(
      JSON.stringify({ allowed: false, error: 'Missing bucket.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Anon client — sufficient for IP-keyed buckets and for the retryAfter query
  const supabaseAnon = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let identifier: string

  if ((IP_BUCKETS as string[]).includes(bucket)) {
    // IP-keyed buckets: no JWT required
    if (bucket === 'login') {
      if (!json.email) {
        return new Response(
          JSON.stringify({ allowed: false, error: 'Missing email for login bucket.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      identifier = `email:${json.email.toLowerCase().trim()}`
    } else {
      identifier = `ip:${extractIp(req)}`
    }
  } else if (bucket === 'org_upgrade') {
    // User-keyed bucket: JWT required
    const authHeader = req.headers.get('Authorization')
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader ?? '' } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ allowed: false, error: 'Unauthorized.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    identifier = `user:${user.id}`
  } else {
    // Unknown bucket → 400 Bad Request (not 429 — this is a caller error, not a rate limit event)
    return new Response(
      JSON.stringify({ allowed: false, error: 'Unknown bucket.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Call the RPC. On error: fail open (GoTrue + RLS are final backstops for client surfaces)
  const { data: allowed, error: rpcErr } = await supabaseAnon.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_bucket:     bucket,
  })

  if (rpcErr) {
    console.error('[check-rate-limit] RPC error:', rpcErr.message)
    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!allowed) {
    const secs = await calcRetryAfter(supabaseAnon, identifier, bucket)
    return new Response(
      JSON.stringify({ allowed: false, retryAfterSeconds: secs }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(secs),  // RFC 7231 machine-readable header
        },
      }
    )
  }

  return new Response(
    JSON.stringify({ allowed: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
```

- [ ] **Step 2: Run typecheck**

```bash
cd "c:/Users/LENOVO/Documents/DEVCON+ with Claude Code"
npm run typecheck
```

Expected: no errors. (Deno-specific globals like `Deno.serve` won't be checked by TSC — that's expected.)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/check-rate-limit/index.ts
git commit -m "feat(rate-limiting): add check-rate-limit edge function"
```

---

## Task 3: Modify generate-qr-token — add qr_generate rate limit

**Files:**
- Modify: `supabase/functions/generate-qr-token/index.ts`

The rate limit check is inserted **after** the service-role client is created and **before** `req.json()` is called. This avoids wasting a body parse on a rate-limited request and correctly uses the service-role client (which has full table access for the RPC).

- [ ] **Step 1: Add the rate limit block**

In `supabase/functions/generate-qr-token/index.ts`, find this exact block (ends at line 52):

```typescript
    // Service role client for data operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
```

Immediately after (before `const { registration_id } = await req.json()`), insert:

```typescript
    // Rate limit: 10 token requests per user per 60s.
    // Placed before req.json() — body is only parsed if not rate-limited.
    // Fail closed — any RPC error returns 429 (protects the points ecosystem).
    const { data: rlAllowed, error: rlError } = await supabase.rpc('check_rate_limit', {
      p_identifier: `user:${user.id}`,
      p_bucket:     'qr_generate',
    })
    if (rlError || !rlAllowed) {
      return new Response(
        JSON.stringify({ error: 'Too many token requests. Please wait before refreshing your ticket.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      )
    }
```

- [ ] **Step 2: Verify placement**

Read the file. Confirm the new block appears between the service-role client creation and `const { registration_id } = await req.json()`. No other logic should be between them.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/generate-qr-token/index.ts
git commit -m "feat(rate-limiting): add qr_generate rate limit to generate-qr-token"
```

---

## Task 4: Modify award-points-on-scan — add qr_scan rate limit

**Files:**
- Modify: `supabase/functions/award-points-on-scan/index.ts`

The rate limit check is inserted after organizer role verification and before the registration lookup. The existing `checked_in` atomic guard (further down in the function) remains the authoritative double-award defence — the scan rate limit is a separate layer on top.

- [ ] **Step 1: Add the rate limit block**

In `supabase/functions/award-points-on-scan/index.ts`, find this exact block (ends around line 101):

```typescript
    if (orgError || !organizer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: not an organizer.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
```

Immediately after (before `// 4. Find registration by ID`), insert:

```typescript
    // Rate limit: 60 scans per organizer per 60s (~1 scan/sec — sufficient for busy events).
    // Fail closed — any RPC error returns 429 (protects the points ecosystem).
    // Note: double-award prevention is handled by the checked_in atomic guard below,
    //       not by this rate limit.
    const { data: rlAllowed, error: rlError } = await supabase.rpc('check_rate_limit', {
      p_identifier: `user:${organizer.id}`,
      p_bucket:     'qr_scan',
    })
    if (rlError || !rlAllowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Scan rate exceeded. Please slow down.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      )
    }
```

- [ ] **Step 2: Verify placement**

Read the file. Confirm the new block appears after the `orgError || !organizer` check and before `// 4. Find registration by ID`. The `checked_in` guard in the `.update()` call near the bottom must be untouched.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/award-points-on-scan/index.ts
git commit -m "feat(rate-limiting): add qr_scan rate limit to award-points-on-scan"
```

---

## Task 5: Add callRateLimit helper to useAuthStore

**Files:**
- Modify: `apps/member/src/stores/useAuthStore.ts`

Add the `callRateLimit` helper function before the `create(...)` call. This helper is used by all client-side rate-limited surfaces. It includes optional `token` support for the `org_upgrade` bucket (which requires a JWT).

**Important:** `supabaseUrl` is NOT exported from `lib/supabase.ts`. Use `import.meta.env.VITE_SUPABASE_URL` directly in the helper body.

- [ ] **Step 1: Read lib/supabase.ts to confirm exports**

Read `apps/member/src/lib/supabase.ts`. Verify that only `supabase` (the client) is exported — not a URL constant. This confirms we must use `import.meta.env.VITE_SUPABASE_URL`.

- [ ] **Step 2: Add the callRateLimit helper**

In `useAuthStore.ts`, after the imports block (after line 3, before `export const ORGANIZER_ROLES`), add:

```typescript
// Calls the check-rate-limit edge function.
// Returns { allowed, retryAfterSeconds? }.
// On any network/server error → { allowed: true } (fail open — GoTrue + RLS are final backstops).
// token: pass the user's access_token for user-keyed buckets (org_upgrade).
async function callRateLimit(
  bucket: string,
  extra?: { email?: string; token?: string }
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (extra?.token) headers['Authorization'] = `Bearer ${extra.token}`
    const { token: _unused, ...body } = extra ?? {}
    const res = await fetch(`${supabaseUrl}/functions/v1/check-rate-limit`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ bucket, ...body }),
    })
    if (!res.ok && res.status !== 429) return { allowed: true }
    return await res.json() as { allowed: boolean; retryAfterSeconds?: number }
  } catch {
    return { allowed: true }
  }
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd "c:/Users/LENOVO/Documents/DEVCON+ with Claude Code"
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/stores/useAuthStore.ts
git commit -m "feat(rate-limiting): add callRateLimit helper to useAuthStore"
```

---

## Task 6: Modify useAuthStore — signIn with server rate limiting

**Files:**
- Modify: `apps/member/src/stores/useAuthStore.ts` — `signIn()` (lines 234–248)

- [ ] **Step 1: Replace signIn body**

Find and replace the `signIn` function. The BEFORE block is:

```typescript
  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    // Eagerly fetch/create profile so callers can read user.role immediately after signIn() returns
    if (data.session?.user) {
      const meta = { ...data.session.user.user_metadata, email: data.session.user.email ?? null } as Record<string, string | null>
      const profile = await ensureProfile(data.session.user.id, meta)
      if (profile) await applyProfile(profile, set)
    }
    set({ isLoading: false })
  },
```

Replace with:

```typescript
  signIn: async (email, password) => {
    set({ isLoading: true, error: null })

    // Dual-key rate limit: per-email + per-IP, in parallel for minimal latency
    const [emailLimit, ipLimit] = await Promise.all([
      callRateLimit('login', { email }),
      callRateLimit('login_ip'),
    ])

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const secs = emailLimit.retryAfterSeconds ?? ipLimit.retryAfterSeconds ?? 300
      const err = new Error(`Too many login attempts. Please wait ${secs} seconds before trying again.`)
      ;(err as Error & { retryAfterSeconds: number }).retryAfterSeconds = secs
      set({ isLoading: false, error: err.message })
      throw err
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    // Eagerly fetch/create profile so callers can read user.role immediately after signIn() returns
    if (data.session?.user) {
      const meta = { ...data.session.user.user_metadata, email: data.session.user.email ?? null } as Record<string, string | null>
      const profile = await ensureProfile(data.session.user.id, meta)
      if (profile) await applyProfile(profile, set)
    }
    set({ isLoading: false })
  },
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/stores/useAuthStore.ts
git commit -m "feat(rate-limiting): add dual-key login rate limit to signIn()"
```

---

## Task 7: Modify useAuthStore — signUp with advisory rate limit

**Files:**
- Modify: `apps/member/src/stores/useAuthStore.ts` — `signUp()` (lines 198–232)

The signup rate limit is advisory only: it enforces at the client layer but cannot stop direct calls to Supabase GoTrue. This is an accepted MVP limitation (noted in spec Section 8).

- [ ] **Step 1: Add IP rate limit to start of signUp**

Find `signUp: async (email, password, full_name, username, chapter_id, school_or_company) => {` and add the rate limit check immediately after `set({ isLoading: true, error: null })`:

```typescript
  signUp: async (email, password, full_name, username, chapter_id, school_or_company) => {
    set({ isLoading: true, error: null })

    // Advisory rate limit: 3 signups per IP per hour. Cannot block direct GoTrue calls.
    // Deferred CAPTCHA (Cloudflare Turnstile) will close this gap at infrastructure level.
    const signupLimit = await callRateLimit('signup')
    if (!signupLimit.allowed) {
      const secs = signupLimit.retryAfterSeconds ?? 3600
      const err = new Error(`Too many accounts created from this network. Please try again in ${Math.ceil(secs / 60)} minutes.`)
      set({ isLoading: false, error: err.message })
      throw err
    }

    // ... rest of signUp unchanged
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/stores/useAuthStore.ts
git commit -m "feat(rate-limiting): add advisory signup rate limit to signUp()"
```

---

## Task 8: Modify useAuthStore — checkUsernameAvailable + requestOrganizerUpgrade

**Files:**
- Modify: `apps/member/src/stores/useAuthStore.ts` — `checkUsernameAvailable()` and `requestOrganizerUpgrade()`

Two modifications in one commit since both are small.

- [ ] **Step 1: Update checkUsernameAvailable**

Find and replace:

```typescript
  checkUsernameAvailable: async (username) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()
    return !data
  },
```

Replace with:

```typescript
  checkUsernameAvailable: async (username) => {
    // Rate limit: 30 checks per IP per 60s. Blocked → return false (silent degradation —
    // shows username as "unavailable", no error message shown to the user).
    const limit = await callRateLimit('username_check')
    if (!limit.allowed) return false

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()
    return !data
  },
```

- [ ] **Step 2: Update requestOrganizerUpgrade — first update the callRateLimit call**

**This step must happen before the function body modification.** Update the `callRateLimit` helper to pass the session token for the `org_upgrade` bucket. The helper already supports `token` (added in Task 5) — here we just use it.

At the top of `requestOrganizerUpgrade`, after `if (!current) throw new Error('Not authenticated')`, add:

```typescript
    // Rate limit: 3 attempts per user per 25h — prevents organizer code brute-forcing.
    // Requires JWT (org_upgrade is a user-keyed bucket in the edge function).
    const { data: { session } } = await supabase.auth.getSession()
    const upgradeLimit = await callRateLimit('org_upgrade', { token: session?.access_token })
    if (!upgradeLimit.allowed) {
      const secs = upgradeLimit.retryAfterSeconds ?? 86400
      const hours = Math.ceil(secs / 3600)
      throw new Error(
        `You've reached the daily limit for organizer code attempts. Try again in ${hours} hour${hours !== 1 ? 's' : ''}.`
      )
    }
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/stores/useAuthStore.ts
git commit -m "feat(rate-limiting): add username_check + org_upgrade rate limits"
```

---

## Task 9: Modify SignIn.tsx — upgrade client lockout to match server limits

**Files:**
- Modify: `apps/member/src/pages/auth/SignIn.tsx` (lines 11–12 and the catch block)

The client-side `useRef` lockout is a UX fast-path only. Upgrade it to match the server's 300s window. Also surface `retryAfterSeconds` from server errors when the server rejects before the client lockout triggers.

- [ ] **Step 1: Update the constants**

Find and replace:

```typescript
const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 30_000
```

Replace with:

```typescript
const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 300_000  // 300s — matches server login bucket window
```

- [ ] **Step 2: Update the catch block to surface server retryAfterSeconds**

Find the existing catch block:

```typescript
    } catch (err) {
      failedAttempts.current += 1
      if (failedAttempts.current >= MAX_ATTEMPTS) {
        lockedUntil.current    = Date.now() + LOCKOUT_MS
        failedAttempts.current = 0
        setFormError(`Too many failed attempts. Please wait ${LOCKOUT_MS / 1000} seconds before trying again.`)
      } else {
        setFormError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      }
    }
```

Replace with:

```typescript
    } catch (err) {
      // Server rate limit: if the error carries retryAfterSeconds, show the server's duration.
      // Reset failedAttempts so the client counter doesn't compound with the server block.
      const serverSecs = (err as { retryAfterSeconds?: number }).retryAfterSeconds
      if (serverSecs) {
        failedAttempts.current = 0
        setFormError(`Too many login attempts. Please wait ${serverSecs} seconds before trying again.`)
        return
      }

      failedAttempts.current += 1
      if (failedAttempts.current >= MAX_ATTEMPTS) {
        lockedUntil.current    = Date.now() + LOCKOUT_MS
        failedAttempts.current = 0
        setFormError(`Too many failed attempts. Please wait ${LOCKOUT_MS / 1000} seconds before trying again.`)
      } else {
        setFormError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      }
    }
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Smoke-test in browser**

```bash
npm run dev:member
```

1. Navigate to `/sign-in`
2. Submit with wrong credentials 5 times
3. Expected: after 5th failure, client lockout message shows **300 seconds** (not 30)
4. Check browser Network tab — confirm `check-rate-limit` POST calls appear on each submit (before Supabase is provisioned these will fail open — that's correct)

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/auth/SignIn.tsx
git commit -m "feat(rate-limiting): upgrade client lockout to 300s, surface server retryAfterSeconds"
```

---

## Task 10: Deploy edge functions + end-to-end verification

Run this task when the Supabase project is provisioned.

- [ ] **Step 1: Apply the migration**

```bash
supabase db push
```

Or paste `supabase/migrations/20260322_rate_limiting.sql` into the Supabase SQL editor and run it.

- [ ] **Step 2: Deploy all three edge functions**

```bash
supabase functions deploy check-rate-limit
supabase functions deploy generate-qr-token
supabase functions deploy award-points-on-scan
```

- [ ] **Step 3: Verify check-rate-limit is callable**

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/check-rate-limit \
  -H "Content-Type: application/json" \
  -H "apikey: <anon-key>" \
  -d '{"bucket":"signup"}'
```

Expected: `{"allowed":true}` on calls 1–3. On call 4: `{"allowed":false,"retryAfterSeconds":3600}`.

- [ ] **Step 4: Verify generate-qr-token rate limiting**

Using a valid user JWT, call `generate-qr-token` 11 times rapidly:

```bash
for i in {1..11}; do
  curl -s -X POST https://<your-project>.supabase.co/functions/v1/generate-qr-token \
    -H "Authorization: Bearer <user-jwt>" \
    -H "Content-Type: application/json" \
    -d '{"registration_id":"<valid-uuid>"}' | jq .
done
```

Expected: calls 1–10 succeed or return a registration error; call 11 returns `{"error":"Too many token requests..."}` with status 429.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-qr-token/index.ts \
        supabase/functions/award-points-on-scan/index.ts \
        supabase/functions/check-rate-limit/index.ts
git commit -m "chore: deploy rate limiting — migration applied, edge functions deployed"
```

---

## Summary

| Task | Deliverable | Status |
|---|---|---|
| 1 | `20260322_rate_limiting.sql` — table + RPC + GRANT + pg_cron | ☐ |
| 2 | `check-rate-limit/index.ts` — new edge function | ☐ |
| 3 | `generate-qr-token/index.ts` — qr_generate check | ☐ |
| 4 | `award-points-on-scan/index.ts` — qr_scan check | ☐ |
| 5 | `useAuthStore.ts` — callRateLimit helper | ☐ |
| 6 | `useAuthStore.ts` — signIn dual-key limit | ☐ |
| 7 | `useAuthStore.ts` — signUp advisory limit | ☐ |
| 8 | `useAuthStore.ts` — checkUsernameAvailable + requestOrganizerUpgrade | ☐ |
| 9 | `SignIn.tsx` — client lockout 300s + server retryAfterSeconds | ☐ |
| 10 | Deploy + end-to-end verification (at provisioning) | ☐ |
