# Secure Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the DEVCON+ deployment with HTTP security headers, tightened Edge Function CORS, structured security logging, and a documented secrets contract.

**Architecture:** Security headers are added to `apps/member/vercel.json` (Vercel enforces them at CDN level). Each Edge Function gets a per-request `getCorsHeaders(req)` helper replacing the static `'*'` CORS constant, and imports a new `_shared/logger.ts` utility for structured JSON log output. A `SECURITY.md` file documents where every secret and config variable lives.

**Tech Stack:** Vercel (headers config), Deno/TypeScript (Edge Functions), `supabase/functions/_shared/` (shared module pattern)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/member/vercel.json` | Modify | Add security headers + Report-Only CSP |
| `supabase/functions/_shared/logger.ts` | Create | Structured JSON logger for Edge Functions |
| `supabase/functions/check-rate-limit/index.ts` | Modify | CORS tightening + logger integration |
| `supabase/functions/award-points-on-scan/index.ts` | Modify | CORS tightening + logger integration |
| `supabase/functions/generate-qr-token/index.ts` | Modify | CORS tightening + fix missing corsHeaders on UUID 400 path + logger |
| `SECURITY.md` | Create | Secrets management contract |

---

## Task 1: Add HTTP Security Headers to Vercel

**Files:**
- Modify: `apps/member/vercel.json`

### Current state of the file
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 1: Replace `apps/member/vercel.json` with the secured version**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(self), microphone=(), geolocation=()"
        },
        {
          "key": "Content-Security-Policy-Report-Only",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com; img-src 'self' data: blob: https://*.supabase.co; frame-src https://accounts.google.com; font-src 'self';"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
cd "apps/member"
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')"
```

Expected output: `valid`

- [ ] **Step 3: Commit**

```bash
git add apps/member/vercel.json
git commit -m "feat(security): add HTTP security headers + Report-Only CSP to Vercel"
```

---

## Task 2: Create Shared Logger

**Files:**
- Create: `supabase/functions/_shared/logger.ts`

The `_shared/` directory is the Supabase convention for code shared across Edge Functions. Supabase captures all stdout from functions and makes it searchable in Dashboard → Logs → Edge Functions. Structured JSON makes log entries filterable by field.

- [ ] **Step 1: Create `supabase/functions/_shared/logger.ts`**

```typescript
// supabase/functions/_shared/logger.ts
// Structured JSON logger for Edge Functions.
// All output goes to stdout — Supabase captures it in Dashboard → Logs → Edge Functions.

type LogLevel = 'info' | 'warn' | 'error'

function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info:  (event: string, data?: Record<string, unknown>) => log('info',  event, data),
  warn:  (event: string, data?: Record<string, unknown>) => log('warn',  event, data),
  error: (event: string, data?: Record<string, unknown>) => log('error', event, data),
}
```

- [ ] **Step 2: Verify the file exists and is importable (visual check)**

Open `supabase/functions/_shared/logger.ts` — confirm it exports `logger` with `info`, `warn`, `error` methods.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/logger.ts
git commit -m "feat(security): add shared structured JSON logger for Edge Functions"
```

---

## Task 3: Tighten CORS + Add Logging — `check-rate-limit`

**Files:**
- Modify: `supabase/functions/check-rate-limit/index.ts`

**What changes:**
1. Replace the static `corsHeaders` const with a per-request `getCorsHeaders(req)` function
2. Replace every `corsHeaders` spread with `getCorsHeaders(req)`
3. Import `logger` and log `rate_limit_blocked` (warn) and `rate_limit_rpc_error` (error)

- [ ] **Step 1: Add the ALLOWED_ORIGIN helper and logger import at the top of the file**

After the existing imports, add:

```typescript
import { logger } from '../_shared/logger.ts'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
```

Then **delete** the old `corsHeaders` const:
```typescript
// DELETE this block:
const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

- [ ] **Step 2: Update the OPTIONS preflight to use `getCorsHeaders(req)`**

Find:
```typescript
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
```

Replace with:
```typescript
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }
```

- [ ] **Step 3: Update all remaining response headers in the function body**

Every response in `check-rate-limit/index.ts` spreads `corsHeaders`. Replace every `...corsHeaders` with `...getCorsHeaders(req)`. There are multiple occurrences — find them all with a search for `corsHeaders` in the file and replace each one.

- [ ] **Step 4: Add logging for rate_limit_blocked**

Find the block that returns the 429 when `!allowed`:
```typescript
  if (!allowed) {
    const secs = await calcRetryAfter(supabaseAnon, identifier, bucket)
    return new Response(
      JSON.stringify({ allowed: false, retryAfterSeconds: secs }),
      {
        status: 429,
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json',
          'Retry-After': String(secs),
        },
      }
    )
  }
```

Add a logger call immediately before the `return new Response(...)`:
```typescript
    logger.warn('rate_limit_blocked', { bucket, identifier })
```

- [ ] **Step 5: Add logging for RPC errors**

Find the block that handles `rpcErr`:
```typescript
  if (rpcErr) {
    console.error('[check-rate-limit] RPC error:', rpcErr.message)
    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
```

Replace `console.error(...)` with `logger.error(...)`:
```typescript
  if (rpcErr) {
    logger.error('rate_limit_rpc_error', { message: rpcErr.message })
    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
```

- [ ] **Step 6: Verify no remaining references to old `corsHeaders` const**

Search the file for the literal string `corsHeaders` — only `getCorsHeaders` should remain. No bare `corsHeaders` references.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/check-rate-limit/index.ts
git commit -m "feat(security): tighten CORS + add structured logging in check-rate-limit"
```

---

## Task 4: Tighten CORS + Add Logging — `award-points-on-scan`

**Files:**
- Modify: `supabase/functions/award-points-on-scan/index.ts`

Same pattern as Task 3. All responses in this function already spread `corsHeaders` — confirmed by reading the file.

- [ ] **Step 1: Add the ALLOWED_ORIGIN helper and logger import**

After the existing imports, add:
```typescript
import { logger } from '../_shared/logger.ts'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
```

Delete the old `corsHeaders` const.

- [ ] **Step 2: Replace all `...corsHeaders` spreads with `...getCorsHeaders(req)`**

Search for `corsHeaders` in the file. Replace every `...corsHeaders` with `...getCorsHeaders(req)`. Covers: OPTIONS return, 401, 400, JWT error 200s, 403, 429, 404s, already-checked-in 200, and the success 200.

- [ ] **Step 3: Add logging for QR scan success**

Find the final success return (after `increment_member_points`):
```typescript
    return new Response(
      JSON.stringify({
        success:        true,
        member_name:    member?.full_name ?? 'Member',
        points_awarded: event.points_value,
        event_title:    event.title,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
```

Add logger call immediately before it:
```typescript
    logger.info('qr_scan_success', {
      member_id:     reg.user_id,
      event_id:      reg.event_id,
      points_awarded: event.points_value,
    })
```

- [ ] **Step 4: Add logging for invalid token**

Find the JWT verify catch block that returns `invalid_token`:
```typescript
    } catch (jwtErr) {
      const isExpired = jwtErr instanceof Error && jwtErr.message.toLowerCase().includes('expired')
      return new Response(
        JSON.stringify({ success: false, error: isExpired ? 'token_expired' : 'invalid_token' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
```

Add logger call at the start of the catch block:
```typescript
    } catch (jwtErr) {
      const isExpired = jwtErr instanceof Error && jwtErr.message.toLowerCase().includes('expired')
      logger.warn('qr_scan_invalid_token', {
        reason: isExpired ? 'token_expired' : 'invalid_token',
        token_prefix: typeof token === 'string' ? token.slice(0, 8) : 'unknown',
      })
      return new Response(
        JSON.stringify({ success: false, error: isExpired ? 'token_expired' : 'invalid_token' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
```

- [ ] **Step 5: Add logging for unexpected errors**

Find the outer catch block at the bottom:
```typescript
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal error.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
```

Add logger call at the start of the catch block:
```typescript
  } catch (err) {
    logger.error('qr_scan_error', { message: err instanceof Error ? err.message : 'Internal error.' })
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal error.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
```

- [ ] **Step 6: Verify no remaining `corsHeaders` references**

Search the file for `corsHeaders` — none should remain.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/award-points-on-scan/index.ts
git commit -m "feat(security): tighten CORS + add structured logging in award-points-on-scan"
```

---

## Task 5: Tighten CORS + Fix Missing Header + Add Logging — `generate-qr-token`

**Files:**
- Modify: `supabase/functions/generate-qr-token/index.ts`

This function has an additional bug: the UUID format validation 400 response (line 79–83) spreads no CORS headers at all — the browser would silently drop this error response. Fix it in the same pass.

- [ ] **Step 1: Add the ALLOWED_ORIGIN helper and logger import**

After the existing imports, add:
```typescript
import { logger } from '../_shared/logger.ts'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
```

Delete the old `corsHeaders` const.

- [ ] **Step 2: Replace all `...corsHeaders` spreads with `...getCorsHeaders(req)`**

Search for `corsHeaders` in the file. Replace every `...corsHeaders` with `...getCorsHeaders(req)`.

- [ ] **Step 3: Fix the missing CORS headers on the UUID 400 response**

Find this response (the one missing cors headers entirely):
```typescript
    if (!UUID_RE.test(registration_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid registration_id format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
```

Replace with:
```typescript
    if (!UUID_RE.test(registration_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid registration_id format.' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
```

- [ ] **Step 4: Add logging for QR token generation success**

Find the final success return:
```typescript
    return new Response(
      JSON.stringify({ token, expires_at: expiresAt }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
```

Add logger call immediately before it:
```typescript
    logger.info('qr_token_generated', { registration_id: reg.id })
```

- [ ] **Step 5: Add logging for unexpected errors**

Find the outer catch block:
```typescript
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
```

Add logger call at the start of the catch block:
```typescript
  } catch (err) {
    logger.error('qr_token_error', { message: err instanceof Error ? err.message : 'Internal error.' })
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
```

- [ ] **Step 6: Verify no remaining `corsHeaders` references and the UUID 400 path now has CORS headers**

Search for `corsHeaders` — none should remain. Visually confirm the UUID validation block now spreads `getCorsHeaders(req)`.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/generate-qr-token/index.ts
git commit -m "feat(security): tighten CORS + fix missing header + add logging in generate-qr-token"
```

---

## Task 6: Write SECURITY.md

**Files:**
- Create: `SECURITY.md` at repo root

- [ ] **Step 1: Create `SECURITY.md`**

```markdown
# Security & Secrets Management

This document defines where every secret and configuration variable lives for DEVCON+.
All contributors must follow this contract. Do not deviate without team review.

---

## Variable Classification

| Variable | Type | Lives in | Never in |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Public config | Vercel env vars | Committed `.env` files, code |
| `VITE_SUPABASE_ANON_KEY` | Public config | Vercel env vars | Committed `.env` files, code |
| `VITE_GOOGLE_CLIENT_ID` | Public config | Vercel env vars | Committed `.env` files, code |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Supabase Edge Function secrets only | Vercel, frontend code, git |
| `QR_JWT_SECRET` | **Secret** | Supabase Edge Function secrets only | Vercel, frontend code, git |
| `ALLOWED_ORIGIN` | Plain config | Supabase Edge Function env vars | Secrets store, code |

> Generate `QR_JWT_SECRET` with: `openssl rand -hex 32`

---

## Rules

### 1. `VITE_*` variables are public
Vite bundles `VITE_*` variables into the JavaScript that the browser downloads.
**Never store anything sensitive** — tokens, private keys, passwords — with a `VITE_` prefix.
`VITE_SUPABASE_ANON_KEY` is safe to expose: it is a publishable key governed by Row Level Security.

### 2. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS
This key has full database access with no Row Level Security applied.
It must **only** exist in Supabase's Edge Function secrets store and be read via `Deno.env.get()`.
Never add it to Vercel, never reference it in frontend code, never commit it to git.

### 3. `ALLOWED_ORIGIN` is not a secret
It is the public URL of the deployed app (e.g. `https://devconplus.vercel.app`).
Store it as a plain Edge Function environment variable — not in the secrets store.
For local development, set it to `http://localhost:5173` in your shell or local `.env`.

### 4. `.env.local` is gitignored — verify before every commit
Run `git status` before committing. If any `.env*` file appears as staged or untracked,
do not commit. Add it to `.gitignore` if missing.

### 5. Key rotation procedure
1. Generate the new key/secret.
2. Update it in Vercel dashboard (for `VITE_*` vars) **and/or** Supabase secrets (for server vars).
3. Redeploy — Vercel: trigger a new deployment; Supabase: `supabase functions deploy <name>`.
4. Confirm the old key is revoked at the provider (Supabase dashboard → API settings).

---

## Operator Setup Checklist (first deploy)

- [ ] Set `VITE_SUPABASE_URL` in Vercel → Settings → Environment Variables
- [ ] Set `VITE_SUPABASE_ANON_KEY` in Vercel → Settings → Environment Variables
- [ ] Set `VITE_GOOGLE_CLIENT_ID` in Vercel → Settings → Environment Variables
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Supabase → Edge Functions → Secrets
- [ ] Set `QR_JWT_SECRET` in Supabase → Edge Functions → Secrets (generate with: `openssl rand -hex 32`)
- [ ] Set `ALLOWED_ORIGIN` in Supabase → Edge Functions → Environment (plain var, not secret)
  - Value: your Vercel production URL, e.g. `https://devconplus.vercel.app`

---

## Future Edge Functions

`validate-organizer-code` and `auto-approve-registration` are planned but not yet implemented.
When built, they **must** use the `getCorsHeaders(req)` origin-validation pattern — not `'*'`.
See `supabase/functions/check-rate-limit/index.ts` for the reference implementation.
```

- [ ] **Step 2: Commit**

```bash
git add SECURITY.md
git commit -m "docs(security): add secrets management contract and operator setup checklist"
```

---

## Task 7: Manual Smoke Test

No automated test harness exists for Deno Edge Functions in this repo. Verify the changes work end-to-end after deployment.

- [ ] **Step 1: Deploy Edge Functions**

```bash
supabase functions deploy check-rate-limit
supabase functions deploy award-points-on-scan
supabase functions deploy generate-qr-token
```

- [ ] **Step 2: Set `ALLOWED_ORIGIN` in Supabase**

In Supabase Dashboard → Edge Functions → Environment Variables, add:
```
ALLOWED_ORIGIN=http://localhost:5173
```
(Use your Vercel domain when deploying to production.)

- [ ] **Step 3: Run the member app and verify CORS works from localhost**

```bash
npm run dev:member
```

Open the app at `http://localhost:5173`. Sign in and complete the following flows while watching the browser's Network tab for any CORS errors (red requests, `Cross-Origin Request Blocked` messages):

- [ ] Sign in (triggers `check-rate-limit` for login bucket)
- [ ] Register for an event (triggers `generate-qr-token`)
- [ ] Open ticket screen (triggers QR token generation)

If any CORS errors appear, check that `ALLOWED_ORIGIN` matches the origin in the Network request exactly (including `http://` vs `https://` and port).

- [ ] **Step 4: Smoke test `award-points-on-scan` logging**

In the organizer QR scanner flow, scan a valid member ticket. Open Supabase Dashboard → Logs → Edge Functions, filter by `award-points-on-scan`. Confirm a `qr_scan_success` log entry appears:

```json
{ "level": "info", "event": "qr_scan_success", "member_id": "...", "event_id": "...", "points_awarded": 200, "ts": "..." }
```

- [ ] **Step 5: Verify logs appear in Supabase Dashboard for rate limiting**

Open Supabase Dashboard → Logs → Edge Functions. Filter by function name. After triggering a rate-limit block (try signing in 6 times with wrong password), confirm a `rate_limit_blocked` log entry appears in JSON format:

```json
{ "level": "warn", "event": "rate_limit_blocked", "bucket": "login", "identifier": "email:...", "ts": "..." }
```

- [ ] **Step 6: Verify Report-Only CSP in browser DevTools**

Open the deployed app (or localhost). Open DevTools → Console. Navigate through all major flows (sign-in, events, QR ticket, rewards). Confirm **no** `Content Security Policy` violation warnings appear in the console.

- [ ] **Step 7: Final commit if any adjustments were made during smoke test**

```bash
git add -p
git commit -m "fix(security): smoke test adjustments"
```
