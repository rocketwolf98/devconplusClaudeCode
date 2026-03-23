# Secure Deployment Design
**Date:** 2026-03-23
**Branch:** security-hardening
**Status:** Approved — pending implementation

---

## Context

DEVCON+ deploys as:
- **Frontend:** React + Vite SPA on Vercel (`apps/member/`)
- **Backend:** Supabase (Auth, PostgREST, Realtime, Edge Functions)

Prior security work on this branch has addressed: rate limiting (DB-backed, advisory-lock TOCTOU-safe), IDOR hardening (chapter-scoped RLS, SECURITY DEFINER RPCs), and auth resilience (TOKEN_REFRESH_FAILED redirect, deadlock-safe session init).

This spec closes the remaining deployment-level gaps:
1. No HTTP security headers on the Vercel frontend
2. Edge Functions use open CORS (`*`)
3. No structured logging for security-relevant events
4. No documented secrets management contract

---

## Approach

Option A — Vercel headers + Edge Function structured logging. Works entirely within existing infrastructure (Vercel + Supabase). No new services.

---

## Section 1: HTTP Security Headers

**File:** `apps/member/vercel.json`

Add a `headers` block applying to all routes (`/(.*)`).

### Headers enforced immediately

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=()` |

**Notes:**
- HSTS 2-year max-age is the recommended minimum for production. Vercel already serves HTTPS so this is safe to enforce immediately.
- `camera=(self)` not `camera=()` — the QR scanner (`@zxing/browser`) requires camera access from the app's own origin.
- `X-Frame-Options: DENY` prevents clickjacking; the app has no legitimate iframe embedding use case.

### CSP — shipped in Report-Only mode (Phase 1)

Header: `Content-Security-Policy-Report-Only`

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
worker-src 'self';
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com;
img-src 'self' data: blob: https://*.supabase.co;
frame-src https://accounts.google.com;
font-src 'self';
```

**Directive rationale:**
- `script-src 'self'` — Vite production build emits no inline scripts; all JS is file-based.
- `style-src 'unsafe-inline'` — framer-motion injects inline styles at runtime; removing this would break animations.
- `worker-src 'self'` — `@zxing/browser` spawns a Web Worker to decode QR frames. Without this, QR scanning breaks under an enforced CSP.
- `connect-src wss://*.supabase.co` — Supabase Realtime uses WebSockets (event approval pending → ticket flow).
- `frame-src accounts.google.com` — Google OAuth opens in a popup/redirect.
- `img-src data: blob:` — avatar upload preview uses `blob:` URLs; Supabase storage returns `data:` for some transforms.

### CSP — Phase 2 (after QA sign-off)

Change header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. No value changes needed if QA produces no violations.

**How to catch violations during QA:**
CSP Report-Only violations appear only in the **browser DevTools console** (not in Vercel or Supabase logs) unless a `report-uri` endpoint is configured. During QA, a developer must have DevTools open and check the console for `Content Security Policy` warnings after completing each checklist item. A clean console = no violations.

**QA checklist before flipping — each item requires DevTools console open:**
- [ ] Sign in (email/password) — check console
- [ ] Sign in (Google OAuth) — check console
- [ ] Onboarding swipe — check console
- [ ] Event registration → pending → ticket (Realtime WebSocket) — check console
- [ ] QR scanner (camera access + worker thread) — check console
- [ ] Avatar upload — check console
- [ ] Points history — check console
- [ ] Rewards catalog — check console

---

## Section 2: CORS Tightening

**Files:** `check-rate-limit`, `award-points-on-scan`, `generate-qr-token`

### Current state
```ts
'Access-Control-Allow-Origin': '*'
```
Allows any website to call Edge Functions from a browser, potentially exhausting rate limit slots.

### Target state

Each function reads `ALLOWED_ORIGIN` from environment and validates the request's `Origin` header against it. Browsers enforce CORS only when the response `Access-Control-Allow-Origin` matches the request `Origin` — returning a static string without checking the request origin does not achieve origin restriction.

```ts
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? allowedOrigin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
```

`getCorsHeaders(req)` is called per-request (not once at module load) and must be spread into **every** response in the function — including error responses. A missing spread on an error path causes the browser to silently drop the response.

**Known fix-while-you're-here:** `generate-qr-token/index.ts` has a 400 response for invalid UUID format that does not spread `corsHeaders`. This must be fixed in the same pass.

### Environment variable setup (manual step — flagged for operator)

| Where | Variable | Value |
|---|---|---|
| Supabase Edge Function environment | `ALLOWED_ORIGIN` | `https://<your-vercel-domain>.vercel.app` |
| Local dev shell / `.env` | `ALLOWED_ORIGIN` | `http://localhost:5173` |

> `ALLOWED_ORIGIN` is not a secret — it is the public URL of the app. Store it as a plain Edge Function environment variable (not in the secrets store alongside `SUPABASE_SERVICE_ROLE_KEY`).

> **Note:** CORS is browser-enforced only. It does not protect against `curl` or server-to-server calls. Server-side protection remains RLS + service role key gating.

### Forward-looking note

`validate-organizer-code` and `auto-approve-registration` are planned Edge Functions (CLAUDE.md §12) not yet implemented. When built, they **must** use the same `getCorsHeaders(req)` pattern — not `'*'`. Add this to the implementation checklist for those functions.

---

## Section 3: Structured Logging

**New file:** `supabase/functions/_shared/logger.ts`

A lightweight utility that wraps `console.log`/`console.warn`/`console.error` with structured JSON output. Supabase captures stdout from Edge Functions and surfaces it in Dashboard → Logs → Edge Functions.

### Logger interface

```ts
logger.info(event: string, data?: Record<string, unknown>)
logger.warn(event: string, data?: Record<string, unknown>)
logger.error(event: string, data?: Record<string, unknown>)
```

All methods emit:
```json
{ "level": "info|warn|error", "event": "<event_name>", "ts": "<ISO8601>", ...data }
```

### Events to log

| Function | Event name | Level | Key fields |
|---|---|---|---|
| `check-rate-limit` | `rate_limit_blocked` | `warn` | `bucket`, `identifier` |
| `check-rate-limit` | `rate_limit_rpc_error` | `error` | `message` |
| `award-points-on-scan` | `qr_scan_success` | `info` | `member_id`, `event_id`, `points_awarded` |
| `award-points-on-scan` | `qr_scan_invalid_token` | `warn` | `token_prefix` (first 8 chars only — not full token) |
| `award-points-on-scan` | `qr_scan_error` | `error` | `message` |
| `generate-qr-token` | `qr_token_generated` | `info` | `registration_id` |
| `generate-qr-token` | `qr_token_error` | `error` | `message` |

**Privacy note:** `identifier` in rate limit logs contains `email:...` or `ip:...`. This is acceptable — it's internal server-side logging, not exposed to clients. Full QR tokens are never logged; only an 8-char prefix for correlation.

---

## Section 4: Secrets Management

**New file:** `SECURITY.md` at repo root.

Documents the secrets contract for current and future team members.

### Contract

| Variable | Type | Lives in | Never in |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Public config | Vercel env vars | Committed `.env` files, code |
| `VITE_SUPABASE_ANON_KEY` | Public config | Vercel env vars | Committed `.env` files, code |
| `VITE_GOOGLE_CLIENT_ID` | Public config | Vercel env vars | Committed `.env` files, code |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Supabase Edge Function secrets only | Vercel, frontend code, git |
| `ALLOWED_ORIGIN` | Plain config | Supabase Edge Function env vars | Code, secrets store |

### Key rules
1. `VITE_*` variables are **public** — they are bundled into the JS the browser downloads. Never store anything sensitive with a `VITE_` prefix.
2. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It must only exist in Supabase's secret store, accessed via `Deno.env.get()` in Edge Functions. Never put it in Vercel or any frontend config.
3. `ALLOWED_ORIGIN` is not sensitive — it is the public URL of the deployed app. Store it as a plain environment variable, not a secret.
4. `.env.local` is in `.gitignore` — verify before every commit that no `.env*` files are staged.
5. Rotating a key: update in both Vercel dashboard and Supabase secrets, then redeploy.

---

## Files Changed

| File | Change |
|---|---|
| `apps/member/vercel.json` | Add `headers` block (security headers + Report-Only CSP) |
| `supabase/functions/_shared/logger.ts` | New shared structured logger |
| `supabase/functions/check-rate-limit/index.ts` | CORS tightening + logger integration |
| `supabase/functions/award-points-on-scan/index.ts` | CORS tightening + logger integration |
| `supabase/functions/generate-qr-token/index.ts` | CORS tightening + fix missing corsHeaders on 400 path + logger integration |
| `SECURITY.md` | New secrets management documentation |

---

## Out of Scope

- Enforcing CSP (Phase 2, after QA — flip header key only, no value changes)
- External log sink (Logflare, Sentry) — deferred post-MVP
- Database direct access restriction — Supabase Cloud does not expose the Postgres port to the public internet by default; RLS is the enforcement layer
- Push notification infrastructure
- Super Admin panel
- `validate-organizer-code` / `auto-approve-registration` CORS (not yet implemented; flagged in Section 2)
