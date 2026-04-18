# DEVCON+ — Developer Setup Guide

> **Tagline:** Sync. Support. Succeed.
> Platform for DEVCON Philippines — 11 chapters, 60,000+ members.
>
> **Live app:** https://devconplusbeta-v1.vercel.app
> **Repo:** https://github.com/rocketwolf98/devconplusClaudeCode

---

## Quick Start for AI (Claude Code)

If you are a new Claude instance picking up this codebase, read these files **in order** before generating a single line of code:

| Priority | File | Why |
|----------|------|-----|
| 1 | [`.claude/CLAUDE.md`](.claude/CLAUDE.md) | The law. DB schema, routes, every design decision. Non-negotiable rules in Section 0. |
| 2 | [`.claude/context/HANDOVER.md`](.claude/context/HANDOVER.md) | Current state, L1 blockers, what the last team left and why. |
| 3 | [`.claude/rules/vercel-build-safety.md`](.claude/rules/vercel-build-safety.md) | Vercel exits code 2 if TypeScript fails. Know what breaks before you write. |
| 4 | [`.claude/rules/db-connection-resilience.md`](.claude/rules/db-connection-resilience.md) | Required pattern for every layout + Realtime store. Non-negotiable. |
| 5 | [`PRD.md`](PRD.md) | Product context, user stories, KPIs. Read before touching UI. |

**Facts every AI session must have:**
- Font is **Proxima Nova** (self-hosted woff2). Tailwind: `font-proxima` / `font-sans`. Not Geist, not Inter.
- Icons are **`solar-icon-set` outline variant only**. Never `lucide-react`, never emoji in JSX.
- Color system is CSS-custom-property driven. Always `text-primary`/`bg-primary`. Never hardcode hex for primary.
- Tailwind slate scale has **no 600 or 800** — use 500 or 700.
- `<DesktopGuard />` is a **pass-through no-op** — it renders children directly. The layouts handle responsiveness.
- `spendable_points` ≠ `total_points`. The field was renamed. `total_points` does not exist in the live DB.
- Run `npm run typecheck` before every commit — the Vite dev server does NOT catch TypeScript errors that fail the Vercel build.

---

## Prerequisites

| Tool | Required Version |
|------|-----------------|
| Node.js | **v20.x** (LTS) |
| npm | v10+ (comes with Node) |
| Git | any recent version |

> **Windows users:** Use **Git Bash** or **WSL** — not Command Prompt or PowerShell.

---

## 1. Clone and Install

```bash
git clone https://github.com/rocketwolf98/devconplusClaudeCode
cd devconplusClaudeCode

npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is **required** — React 19 peer dependency conflict. Plain `npm install` will fail.

---

## 2. Environment Setup

The app connects to a live Supabase project. You need the `.env.local` file — **ask the outgoing team lead** (Kenshin) to share it.

**`apps/member/.env.local`** (gitignored — never commit):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_CLIENT_ID=<gcp-oauth-client-id>
VITE_APP_ENV=development
VITE_SITE_URL=http://localhost:5173
```

**`supabase/.env`** (gitignored — for edge function deploys):

```env
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> Without `.env.local`, every Supabase call (auth, data, realtime) will fail with a network error.

---

## 3. Running the App

```bash
npm run dev:member
```

Opens at [http://localhost:5173](http://localhost:5173).

Open Chrome DevTools → Toggle Device Toolbar (`Ctrl+Shift+M`) → set width to **390px**. The app is designed for 390px mobile. Desktop gets a sidebar layout automatically at `md` breakpoint.

### Run all apps via Turbo

```bash
npm run dev
```

---

## 4. Login

The app uses real Supabase auth hitting the **live production database**. Create an account on the sign-up screen, or ask the team lead for a test account.

### Member flow

Sign up at `/sign-up` with any email + password. Creates a real Supabase account with `member` role.

### Organizer flow

From sign-up, enter an organizer code when prompted. Ask the team lead for a valid code from the `organizer_codes` table. Routes you to `/organizer`.

### Admin flow (`/admin`)

Requires `hq_admin` or `super_admin` role. Either use an existing admin account or ask the team lead to promote your account in the Supabase dashboard (`profiles` table → set `role = 'hq_admin'`).

> The **Kiosk** page (`/admin/kiosk`) is only visible to `super_admin` accounts.

---

## 5. App Structure

This monorepo contains three distinct user experiences in **one React app** (`apps/member/`):

| Layout | Route Prefix | Guard | Nav Style |
|--------|-------------|-------|-----------|
| `MemberLayout` | `/home`, `/events/*`, `/jobs/*`, `/points/*`, `/rewards`, `/profile/*` | Auth | Floating pill nav (mobile) + primary sidebar (desktop) |
| `OrganizerLayout` | `/organizer/*` | Role: officer/admin | Floating pill nav (mobile) + blue sidebar (desktop) |
| `AdminLayout` | `/admin/*` | Role: hq_admin/super_admin | Desktop-only sidebar |

> **Never mix layout components between route trees.** Shared utility components (`<ComingSoonModal />`, `<Skeleton />`, `<StatusPill />`) are safe; layout shells are not.

### Repository layout

```
devcon-plus/
├── apps/
│   ├── member/
│   │   ├── src/
│   │   │   ├── router.tsx          All routes — the map of the app
│   │   │   ├── components/         MemberLayout, OrganizerLayout, AdminLayout, shared UI
│   │   │   ├── pages/              member/, organizer/, admin/, auth/
│   │   │   ├── stores/             Zustand stores (one per domain)
│   │   │   ├── lib/                animation.ts, supabase.ts, eventTheme.ts, constants.ts
│   │   │   └── hooks/              useFormDraft.ts, useRecoverOnFocus.ts
│   │   └── tailwind.config.js      Design tokens + MD3 type scale
│   └── landing/                    Static landing page
├── packages/
│   └── supabase/
│       └── src/database.types.ts   Generated DB types — regenerate after schema changes
├── supabase/
│   ├── functions/                  Edge Functions (Deno)
│   └── migrations/                 SQL migrations (apply in order)
└── package.json                    Workspace root — framer-motion lives here
```

---

## 6. Design System Essentials

### Program Themes (5 total)

Users can switch their app theme from the Profile screen. The primary color drives all `bg-primary`, `text-primary`, and shadow tokens.

| Theme | id | Primary | Dark |
|-------|----|---------|------|
| DEVCON+ (default) | `devcon` | `#1152D4` | `#0D42AA` |
| She is DEVCON | `she` | `#BE185D` | `#9D174D` |
| DEVCON Kids | `kids` | `#059669` | `#047857` |
| Campus | `campus` | `#D97706` | `#B45309` |
| DEVCON Purple | `purple` | `#7C3AED` | `#6D28D9` |

Persisted via `useThemeStore` → localStorage key `devcon-theme`.

### Typography

Two-tier type system — both are valid, MD3 preferred for new work:

| Tier | Tokens | Use For |
|------|--------|---------|
| **MD3** (preferred, new components) | `text-md3-title-lg`, `text-md3-body-md`, `text-md3-label-md`, etc. (15 tokens) | New components |
| **Legacy** (existing components) | `text-sm`, `text-xs`, `text-base`, `text-3xl` | Do not migrate unless reworking |

### Color Reference

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | CSS var (theme-driven) | Buttons, active nav, headers |
| `blue` | `#1152D4` | Non-themed DEVCON blue alias |
| `navy` | `#1E2A56` | Dark text, indicator dots |
| `gold` | `#F8C630` | XP bar fill, star icon |
| `promoted` | `#F97316` | PROMOTED badge **only** |
| `green` | `#21C45D` | Positive XP, success states |
| `red` | `#EF4444` | Error, sign out |
| `slate-*` | — | 50/100/200/300/400/500/700/900 only — **no 600 or 800** |

### Animation

All framer-motion variants live in [`apps/member/src/lib/animation.ts`](apps/member/src/lib/animation.ts). **Never redefine inline.**

```ts
import { fadeUp, staggerContainer, cardItem } from '@/lib/animation'
// Stagger animate key is "visible" — never "show"
```

### Icon Rule

```tsx
// Always solar-icon-set outline variant — no lucide-react, no emoji
import { HomeOutline } from 'solar-icon-set'

// In a colored container:
<div className="w-10 h-10 rounded-xl bg-primary/10">
  <HomeOutline className="w-5 h-5 text-primary" />
</div>
```

---

## 7. Non-Negotiable Rules

These rules are enforced by CLAUDE.md Section 0. Violating them breaks the product contract.

1. **No Apple Sign-In** — Google OAuth + email/password only
2. **No placeholder text** — use `<ComingSoonModal />` for incomplete features
3. **No dead-end navigation** — every route renders content
4. **2nd job listing + 2nd Tech news post** always get an orange `PROMOTED` badge
5. **TypeScript strict mode** — no `any`, no `@ts-ignore` without explanation
6. **Forms** use React Hook Form + Zod — no uncontrolled inputs
7. **Primary color** — always `text-primary` / `bg-primary`, never hardcode hex for primary
8. **Icons** — `solar-icon-set` outline variant only, no emoji in JSX
9. **Real Supabase client only** — `MOCK_*` exports in `packages/supabase/` are reference data, never import in production components
10. **Two-layer Realtime recovery** — any new layout/store with Supabase Realtime must implement `recover()` + `resubscribe()` on `visibilitychange`, `online`, and 5-min interval

---

## 8. Build + Typecheck

```bash
# TypeScript check across all packages (must pass before commit)
npm run typecheck

# Production build — mirrors Vercel's exact build command
npm run build
```

Output: `apps/member/dist/`

> **Critical:** The Vite dev server is lenient with TypeScript. `tsc -b` enforces `noUnusedLocals`, `noUnusedParameters`, and `strictNullChecks`. Always run `typecheck` before pushing — Vercel exits with code 2 on any TS error, aborting the deploy.

---

## 9. After Any Database Schema Change

```bash
# Regenerate TypeScript types from the live DB
supabase gen types typescript --project-id <project-ref> \
  > packages/supabase/src/database.types.ts

# Verify downstream consumers still build
npm run typecheck
npm run build
```

---

## 10. Deploying Edge Functions

```bash
supabase functions deploy generate-qr-token
supabase functions deploy award-points-on-scan
supabase functions deploy approve-at-door
supabase functions deploy check-rate-limit
supabase functions deploy generate-user-qr

# After adding a new domain to the CORS allowlist in _shared/cors.ts,
# ALL functions must be redeployed.
```

---

## 11. Deployment (Vercel)

Every push to `master` triggers an automatic Vercel production deploy.

| Project | Root Directory | Build Command | Output |
|---------|---------------|---------------|--------|
| Member app | `apps/member` | `tsc -b && vite build` | `dist` |
| Landing | `apps/landing` | *(none)* | `.` |

Env vars are set in Vercel project Settings → Environment Variables.

---

## 12. Common Issues & Gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| `npm install` fails | React 19 peer conflict | Always use `--legacy-peer-deps` |
| Blank screen / auth errors | Missing `.env.local` | Get credentials from team lead |
| Organizer pages redirect away | Account needs officer role | Enter organizer code at sign-up, or ask team lead to update `role` in `profiles` |
| Admin pages redirect away | Account needs `hq_admin` role | Ask team lead to update `role` in Supabase |
| TypeScript errors after pull | New package added | Re-run `npm install --legacy-peer-deps` |
| QR scanner "camera not available" | Requires HTTPS or localhost | Use `localhost:5173` — works on Chrome desktop and Android |
| Vercel build exits code 2 | TypeScript error (unused import, param, etc.) | Run `npm run typecheck` locally and fix before pushing |
| Stale UI after device sleep | Realtime channel died | Check that `resubscribe()` is called in the layout — see `.claude/rules/db-connection-resilience.md` |
| `total_points` TS error | Field was renamed | Use `spendable_points` for redeemable balance, `lifetime_points` for tiers |
| CSS primary color wrong | Theme not applied | Check `useThemeStore` is mounted; verify `MemberLayout` injects CSS vars on mount |
| Cloudflare DNS blocking SSL | Orange-cloud proxy enabled | Set DNS records to "DNS only" (grey cloud) for Vercel CNAME + Resend DKIM |

---

## 13. Credentials & Access

| Credential | Where used | Who to ask |
|-----------|-----------|------------|
| Supabase URL + anon key | `.env.local` | Kenshin (outgoing lead) |
| Supabase service role key | `supabase/.env` | Kenshin |
| Google OAuth client ID | `.env.local` | Kenshin |
| Vercel project access | Deployment, env vars | Kenshin |
| GCP Console access | OAuth redirect URI config | Kenshin |
| Resend account | Email domain verification | DEVCON HQ IT officer |
| Cloudflare DNS panel (`devcon.ph`) | Custom domain + email DNS | DEVCON HQ IT officer |

> Never commit secrets. `.env.local` and `supabase/.env` are gitignored.

---

## 14. Reference Documents

| Document | Location | Focus |
|----------|----------|-------|
| Master architecture + DB schema | [`.claude/CLAUDE.md`](.claude/CLAUDE.md) | The authoritative technical reference |
| Developer handover + status | [`.claude/context/HANDOVER.md`](.claude/context/HANDOVER.md) | L1/L2 items, credentials, knowledge transfer |
| PRD + product context | [`PRD.md`](PRD.md) | User stories, KPIs, milestones |
| Domain + email setup | [`.claude/docs/DOMAIN_AND_EMAIL_SETUP.md`](.claude/docs/DOMAIN_AND_EMAIL_SETUP.md) | Step-by-step DNS, Supabase, GCP config |
| DB connection resilience | [`.claude/rules/db-connection-resilience.md`](.claude/rules/db-connection-resilience.md) | Realtime recovery pattern |
| Vercel build safety | [`.claude/rules/vercel-build-safety.md`](.claude/rules/vercel-build-safety.md) | TS flags that cause deploy failures |
| Agentic workflows | [`.claude/context/agentic-workflows.md`](.claude/context/agentic-workflows.md) | Claude Code workflows for common tasks |
| Context anchor | [`.claude/context/memory.md`](.claude/context/memory.md) | Decision log, architecture evolution, state of play |

---

*DEVCON Philippines · React 19 + Vite 7 · Supabase · Deployed on Vercel*
*MVP target: May 15, 2026 — Cohort 3 Graduation Showcase*
