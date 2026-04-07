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
It is the public URL of the deployed app (e.g. `https://devconplusbeta-v1.vercel.app`).
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
  - Value: your Vercel production URL, e.g. `https://devconplusbeta-v1.vercel.app`

---

## Future Edge Functions

`validate-organizer-code` and `auto-approve-registration` are planned but not yet implemented.
When built, they **must** use the `getCorsHeaders(req)` origin-validation pattern — not `'*'`.
See `supabase/functions/check-rate-limit/index.ts` for the reference implementation.
