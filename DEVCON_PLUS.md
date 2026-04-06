# CLAUDE.md — Devcon Plus Beta V3

This file is the single source of truth for Claude Code on this project.
Read this before doing anything. Follow it strictly.

---

## 🧭 Project Overview

**Product:** Devcon Plus Beta V3
**Domain:** `plus.devcon.com`
**Motto:** clean · secure · simple
**Target:** Public preview on May 15. Dev cutoff April 30. Claude Code available until April 26.

---

## 👥 Team

| Role | Name | Description |
|------|------|-------------|
| **Dev A** | **Kenshin** | Full-time intern. Primary Claude Code operator. New to web dev — needs scaffolding, explanations, and working code he can integrate without deep prior knowledge. |
| **Dev B** | **Kien** | Part-time intern. Frontend background. Handles UI/UX tasks. Stacked with academics — keep his tasks scoped and independent. He presents on May 15. |

**How to work with Kenshin (Dev A):** Always explain what you're generating and why. Prefer working, runnable code over abstract patterns. When he's stuck, help him diagnose before suggesting a rewrite.

**How to work with Kien (Dev B):** Generate isolated, self-contained frontend components. Don't give him tasks that require backend knowledge or that will block Kenshin if delayed.

---

## 📅 Timeline

| Phase | Dates | Notes |
|-------|-------|-------|
| Week 1 | Mar 29 – Apr 4 | Auth, cleanup, security foundations |
| Week 2 | Apr 5 – Apr 11 | Infra, admin UX, input security |
| Week 3 | Apr 12 – Apr 18 | QR system, value-added features, API security |
| Week 4 | Apr 19 – Apr 26 | Pen testing, bug fixes, docs, handover ← **last Claude Code week** |
| Final Push | Apr 27 – Apr 30 | Stabilization only. No new features. No Claude Code. |
| Demo Prep | May 1 – May 14 | Dev B preps presentation |
| Preview | May 15 | Public preview. Dev B presents. |

---

## ✅ Feature Checklist

### L1 — Must Ship (100% by April 26)

#### Auth & Access
- [ ] Sign in with Google (GCP OAuth) — **Kenshin**
- [x] RBAC — HQ admin, chapter admin, standard user roles — **Kenshin** ✅

#### Infra
- [~] Email SMTP client (transactional emails via Resend) — **Kenshin** 🔄 (edge function + templates deployed Apr 6; end-to-end test pending)
- [ ] Finalize `plus.devcon.com` domain (DNS + Cloudflare) — **Kenshin**
- [ ] Cloudflare anti-DDoS + CAPTCHA on auth routes — **Kenshin**

#### Cleanup
- [ ] Remove all test data and test accounts — **Kenshin** (ongoing)
- [x] Remove Easter eggs — **Kenshin** ✅ (Konami restricted to hq_admin/super_admin, commit c8d926d)

#### SEO
- [x] Event URLs use slug based on event name (e.g. `/events/devcon-summit-2025`) — **Kenshin** ✅ (commit b9c3081)

#### Admin
- [x] Admin standardization — HQ admin vs. chapter admin flows defined and implemented — **Kenshin** ✅

#### QR System
- [x] Always-on QR — `/qr` page in Profile menu, `generate-user-qr` edge function deployed — **Kenshin** ✅ (Apr 6)
- [x] Unique QR per user with default fallback QR — user identity token (`k='u'`), auto-matches to next event at organizer's chapter — **Kenshin** ✅ (Apr 6)

#### Security (see Security section below)
- [ ] Dependency / CVE audit — all packages patched — **Kenshin** (ongoing, 25 CVEs cleared Mar 30)
- [ ] HTTPS hardening + security headers (HSTS, CSP, X-Frame-Options, X-Content-Type) — **Kenshin** (ongoing)
- [ ] Input validation & sanitization across all forms and API inputs — **Kenshin** (ongoing)
- [ ] Rate limiting on all endpoints (especially auth, QR, event creation) — **Kenshin** (ongoing)
- [ ] Penetration test pass (OWASP Top 10) + findings fixed — **Kenshin** (ongoing)

---

### L2 — Should Ship (~70–80% by April 30)

- [x] Dedicated admin user page — **Kenshin** ✅ (AdminLayout + AdminUsers + AdminCMS)
- [x] Dedicated standard user page — **Kenshin** ✅ (MemberLayout + full member flow)
- [ ] Themes — auto-detect and apply correct chapter theme — **Kenshin** (deferred to future iteration)
- [ ] Announcements — broadcast messages to chapter members — **Kien** (ongoing)
- [ ] Missions System — basic gamified task/missions flow (MVP only) — **Kien**
- [ ] Boosted / Partnered Events — flag and surface promoted events — **Kien**
- [x] Add to homepage shortcut (PWA manifest) — **Kenshin** ✅ (Apr 6; icons 192/512/maskable, shortcuts, apple-touch-icon)
- [ ] Custom event fields on event creation — modular form components (Google Forms-style) — **Kien**
- [ ] Group Chat — async message board minimum (only if Kenshin has bandwidth in Week 4) — **Kenshin/Kien**

---

### L3 — Deferred (Do not work on these)

- [ ] Static Jobs Board — **Kien** (deferred post-April 30)
- [ ] Kotlin Multiplatform / Flutter port — **Kien** (deferred)

---

## 🔒 Security Guidelines

Security is Dev A's responsibility with Claude Code assistance. It is woven into every week — not batched at the end.

### Week 1 — Foundations
- Run a full dependency audit. Flag packages with known CVEs. Patch or replace them.
- Set all HTTP security headers globally:
  - `Strict-Transport-Security` (HSTS)
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`

### Week 2 — Input Security
- Validate and sanitize **all** user inputs — forms, query params, API bodies.
- Prevent: XSS, SQL injection, malformed data, oversized payloads.
- Use server-side validation. Never trust client-side only.

### Week 3 — API Protection
- Apply rate limiting to every endpoint. Stricter limits on:
  - Auth routes (login, register, password reset)
  - QR generation
  - Event creation
- Return generic error messages — never expose stack traces or internal state.

### Week 4 — Penetration Testing
- Work through the OWASP Top 10 checklist systematically.
- Test areas: authentication, session management, RBAC enforcement, QR endpoint, file inputs, error handling.
- Log every finding. Fix all critical and high findings before April 26.

---

## 🗂 Documentation Requirements (Due April 26)

Before the Claude Code subscription ends, the following must be generated:

- [ ] `README.md` — project setup, environment variables, how to run locally
- [ ] `FEATURES.md` — plain English description of every implemented feature
- [ ] `API.md` — all endpoints, request/response shapes, auth requirements
- [ ] `SECURITY.md` — what was audited, what headers are set, rate limit config, pen test findings and resolutions
- [ ] `HANDOVER.md` — written for Dev B; explains every major user flow in plain language so he can demo without Dev A present

---

## ⚙️ Conventions & Rules

### General
- Keep the codebase **clean, secure, and simple** — the product motto applies to the code too.
- No dead code. No commented-out blocks. No `TODO` left unresolved before April 26.
- Every PR or change should be explainable in one sentence.

### Backend
- All inputs validated server-side before hitting the database.
- RBAC enforced at the API layer — not just in the UI.
- Environment variables for all secrets. Never hardcode credentials.

### Frontend
- Components should be modular and self-contained — especially registration/event form fields.
- Loading states, empty states, and error states are required for every data-fetching component.
- Mobile responsiveness is not optional.

### Security
- Never expose stack traces or internal errors to the client.
- Session tokens must be HttpOnly and Secure.
- QR codes must be unique per user — never reuse or expose another user's QR.

---

## 🚫 What NOT to Do

- Do not work on L3 items (Jobs Board, Kotlin Multiplatform).
- Do not start Group Chat unless Dev A explicitly confirms bandwidth in Week 4.
- Do not introduce new dependencies without running a CVE check first.
- Do not leave pen test findings unresolved past April 26.
- Do not generate code that Dev A cannot understand or explain — if it's too complex, find a simpler approach and explain the tradeoff.
