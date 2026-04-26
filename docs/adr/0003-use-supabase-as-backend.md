# 0003 — Use Supabase as the Unified Backend

- **Date:** 2026-03-29
- **Status:** Accepted
- **Deciders:** Kenshin, Kien

---

## Context

DEVCON+ requires:
- **User authentication** (email/password + Google OAuth)
- **A relational database** (events, registrations, profiles, points, rewards, jobs)
- **Row-level security** (members can only read their own data; officers can read their chapter's data)
- **Real-time subscriptions** (live updates for registration status, notifications)
- **Serverless compute** for token generation and atomic point-award logic (which must not be exposed client-side)
- **File storage** for profile avatars

The team is a two-person intern cohort. A custom backend (Node.js API + managed Postgres) would require DevOps work (CI/CD, migrations, secrets management, monitoring) that exceeds the team's available bandwidth before the April 30 dev freeze.

---

## Decision

Use **Supabase** as the single unified backend service, providing:

| Concern | Supabase Feature |
|---------|-----------------|
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | Supabase Postgres (live production project) |
| RLS | Row-level security policies on all sensitive tables |
| Real-time | Supabase Realtime (`subscribeToChanges` in stores) |
| Serverless compute | Supabase Edge Functions (Deno runtime) |
| File storage | Supabase Storage (avatar uploads) |

**Edge Functions deployed:**

| Function | Purpose |
|----------|---------|
| `generate-qr-token` | Short-lived JWT for QR ticket display |
| `award-points-on-scan` | Atomic check-in + point award on QR scan |
| `approve-at-door` | Officer approves/rejects pending member at venue |
| `check-rate-limit` | IP/user-keyed rate limiting for auth and upgrade flows |
| `generate-user-qr` | User identity QR token for the MyQR page |

**Database types** are generated from the live schema via `supabase gen types typescript` and committed to `packages/supabase/src/database.types.ts`. All store queries are typed against this file.

---

## Consequences

**Easier:**
- Zero DevOps — no server to maintain, no managed Postgres to configure.
- Auth, RLS, real-time, storage, and edge functions are all managed under one dashboard and one `SUPABASE_URL` / `SUPABASE_ANON_KEY`.
- MCP integration: Supabase MCP is already configured in `.mcp.json` for automated schema introspection by AI tools.
- Schema migrations via `supabase db push` — a single command.

**Harder:**
- Vendor lock-in: migrating away from Supabase (e.g. to a custom backend) would require rewriting all stores, edge functions, and auth flows.
- Supabase Realtime on mobile Safari has known WebSocket resilience issues under aggressive background tab killing (documented in `.claude/rules/db-connection-resilience.md`). A two-layer recovery pattern is in place but is not a full fix.
- The free tier has row limits and connection limits that may need upgrading at scale.
- Edge Functions run on Deno — not Node.js — which requires attention to import syntax and available APIs.

**Trade-off accepted:**
- Vendor lock-in is accepted in exchange for speed of delivery. The intern team can ship a full-featured, secure app in ~5 weeks instead of 3+ months. The architecture (stores, API layer) maps cleanly to Kotlin equivalents for the planned Phase 2 KMP native app.
