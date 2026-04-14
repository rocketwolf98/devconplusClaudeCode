# DEVCON+ — Developer Setup Guide

> **Tagline:** Sync. Support. Succeed.
> Platform for DEVCON Philippines — 11 chapters, 60,000+ members.
>
> **Live app:** https://devconplusbeta-v1.vercel.app

This monorepo contains one main app and one shared package:

| App | Tech | Purpose |
|-----|------|---------|
| `apps/member` | React 19 + Vite 7 | Mobile-first web app — member UI **and** organizer UI (separate route trees) |
| `apps/landing` | Static HTML | Simple landing page |
| `packages/supabase` | TypeScript | Shared DB types + mock data |

> The organizer flow lives inside `apps/member` under `/organizer/*` routes with its own layout — there is no separate organizer app.

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
git clone <repo-url>
cd devcon-plus

npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required due to a peer dependency conflict.

---

## 2. Environment Setup

The app connects to a live Supabase project. You need the `.env.local` file — **ask the team lead** to share it with you.

Place it at `apps/member/.env.local`:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> `.env.local` is gitignored — never commit it. Without it, all Supabase calls (auth, data) will fail.

---

## 3. Running the App

```bash
npm run dev:member
```

Opens at [http://localhost:5173](http://localhost:5173).

> Use Chrome DevTools → Toggle Device Toolbar (`Ctrl+Shift+M`) and set width to **390px**. The app has a `<DesktopGuard />` — it will show a "please open on mobile" screen on wider viewports.

### Run all apps via Turbo

```bash
npm run dev
```

---

## 4. Login

The app uses real Supabase auth. Create an account via the sign-up screen, or ask the team lead for a test account.

### Member flow

Sign up at `/sign-up` with any email and password. This creates a real Supabase account with `member` role.

### Organizer flow

From sign-up, enter an organizer code when prompted. Ask the team lead for a valid code from the `organizer_codes` table. This routes you to `/organizer`.

### Admin flow (`/admin`)

Admin access requires `hq_admin` or `super_admin` role. Ask the team lead to either:
- Share an existing admin test account, or
- Promote your account role via the Supabase dashboard (`profiles` table → set `role = 'hq_admin'`)

> The **Kiosk** page (`/admin/kiosk`) is only visible to `super_admin` accounts.

---

## 5. App Structure — What's Built

### Member Screens

| Route | Screen |
|-------|--------|
| `/` | Splash screen |
| `/onboarding` | 4-step swipeable intro (real chapter photos) |
| `/sign-in` | Login |
| `/sign-up` | Registration |
| `/organizer-code-gate` | Organizer code entry |
| `/home` | Dashboard — XP card, quick actions, rotating banner, events, jobs, news, XP history |
| `/events` | Events list (Discover + My Tickets tabs, chapter filter) |
| `/events/:id` | Event detail |
| `/events/:id/register` | Registration form (pre-filled) |
| `/events/:id/pending` | Pending approval screen |
| `/events/:id/ticket` | QR ticket |
| `/jobs` | Jobs board |
| `/jobs/:id` | Job detail + Apply Now |
| `/points` | Ways to earn XP |
| `/points/history` | Transaction log grouped by date |
| `/rewards` | Perks catalog (ComingSoonModal on tap) |
| `/news/:id` | News article detail |
| `/profile` | Profile — program theme selector, XP, menu |
| `/profile/edit` | Edit profile + photo upload |
| `/profile/notifications` | Notification settings |
| `/profile/privacy` | Privacy settings |

### Organizer Screens (same codebase, `/organizer/*`)

| Route | Screen |
|-------|--------|
| `/organizer` | Dashboard — pending approvals + event summary |
| `/organizer/events` | Events list |
| `/organizer/events/create` | Create new event |
| `/organizer/events/:id` | Event detail |
| `/organizer/events/:id/registrants` | Approve / Reject registrants |
| `/organizer/scan` | QR scanner (camera) |
| `/organizer/profile` | Officer profile |
| `/organizer/profile/edit` | Edit officer profile |

### Admin Screens (`/admin/*` — requires `hq_admin` or `super_admin` role)

| Route | Screen | Roles |
|-------|--------|-------|
| `/admin` | Dashboard — stats overview | hq_admin, super_admin |
| `/admin/users` | User management — search, role assignment | hq_admin, super_admin |
| `/admin/org-codes` | Organizer code generation + management | hq_admin, super_admin |
| `/admin/events` | All events across chapters | hq_admin, super_admin |
| `/admin/chapters` | Chapter management | hq_admin, super_admin |
| `/admin/upgrades` | CMS / upgrade requests | hq_admin, super_admin |
| `/admin/kiosk` | On-site check-in kiosk mode | **super_admin only** |

---

## 6. Program Themes

Users can switch their app theme from the Profile screen. The primary color drives all `bg-primary`, `text-primary`, and shadow tokens via CSS custom properties.

| Theme | Color |
|-------|-------|
| DEVCON+ (default) | `#1152D4` blue |
| She is DEVCON | `#EC4899` pink |
| DEVCON Kids | `#21C45D` green |
| Campus | `#F8C630` gold |

---

## 7. Key Design Rules

1. **No Apple Sign-In** — auth is Google OAuth + Email/Password only
2. **2nd job listing + 2nd news post** always get an orange `PROMOTED` badge
3. **No placeholder text** — use `<ComingSoonModal />` for incomplete features
4. **Every tap must go somewhere** — no dead-end navigation
5. **TypeScript strict mode** — no `any`, no `@ts-ignore`
6. **Forms** use React Hook Form + Zod
7. **Icons** — `lucide-react` only, no emoji in JSX
8. **Primary color** — always use `text-primary` / `bg-primary` (CSS var), not hardcoded hex

### Color Reference

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | CSS var (theme-driven) | Buttons, active nav, headers |
| `blue` | `#1152D4` | Non-themed blue alias |
| `navy` | `#1E2A56` | Dark text, indicator dots |
| `gold` | `#F8C630` | XP bar fill, star icon |
| `promoted` | `#F97316` | PROMOTED badge only |
| `green` | `#21C45D` | Positive XP, success states |
| `red` | `#EF4444` | Error, sign out |

---

## 8. Build + Typecheck

```bash
# Production build
npm run build

# TypeScript check across all packages
npm run typecheck
```

Output: `apps/member/dist/`

---

## 9. Folder Structure

```
devcon-plus/
├── apps/
│   ├── member/
│   │   ├── public/
│   │   │   └── photos/          # Real DEVCON chapter photos
│   │   └── src/
│   │       ├── assets/logos/    # DEVCON+ logo variants (SVG)
│   │       ├── components/      # Shared UI components
│   │       ├── lib/             # animation.ts, constants.ts, dates.ts
│   │       ├── pages/
│   │       │   ├── admin/       # Admin panel pages (hq_admin / super_admin)
│   │       │   ├── auth/        # Onboarding, SignIn, SignUp, etc.
│   │       │   ├── dashboard/
│   │       │   ├── events/
│   │       │   ├── jobs/
│   │       │   ├── news/
│   │       │   ├── organizer/   # Organizer route pages
│   │       │   ├── points/
│   │       │   ├── profile/
│   │       │   └── rewards/
│   │       ├── stores/          # Zustand stores
│   │       └── router.tsx       # Flat createBrowserRouter config
│   └── landing/                 # Static HTML landing page
└── packages/
    └── supabase/
        └── src/
            ├── mock/            # MOCK_PROFILE, MOCK_EVENTS, MOCK_JOBS, etc.
            └── types.ts         # Shared TypeScript types
```

---

## 10. Common Issues

**`npm install` fails**
→ Always use `npm install --legacy-peer-deps`

**App shows "Please open on mobile"**
→ Open DevTools → Toggle Device Toolbar → set width to 390px

**Blank screen or auth errors after clone**
→ You're missing `apps/member/.env.local` — ask the team lead for the Supabase credentials

**Organizer pages redirect to sign-in**
→ Your account needs `chapter_officer`, `hq_admin`, or `super_admin` role. Enter a valid organizer code during sign-up, or ask the team lead to update your role in Supabase.

**Admin pages redirect away**
→ Your account needs `hq_admin` or `super_admin` role. Ask the team lead to update your role in the `profiles` table.

**TypeScript errors after pulling**
→ Run `npm install --legacy-peer-deps` — a new package may have been added

**QR scanner says "camera not available"**
→ Requires HTTPS or `localhost`. Works at `localhost:5173` — use Chrome on Android or desktop for scanning

---

## 11. Deployment (Vercel)

The app is live at **https://devconplusbeta-v1.vercel.app**.

| Project | Root Directory | Build Command | Output |
|---------|---------------|---------------|--------|
| Member app | `apps/member` | `npm run build` | `dist` |
| Landing | `apps/landing` | *(none)* | `.` |

See `docs/plans/2026-02-27-pwa-vercel-deployment.md` for full Vercel setup steps.

---

*DEVCON Philippines · React 19 + Vite 7 · MVP Target: April 2026*
