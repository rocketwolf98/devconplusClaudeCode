# DEVCON+ — Developer Setup Guide

> **Tagline:** Sync. Support. Succeed.
> Platform for DEVCON Philippines — 11 chapters, 60,000+ members.

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

## 2. Running the App

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

## 3. Login (Mock Data — No Backend Yet)

All data is mocked. Use these to log in:

**Member flow**

| Field | Value |
|-------|-------|
| Email | `juan@example.com` |
| Password | any value (not validated) |

**Organizer flow**

From the sign-up screen, enter any organizer code (e.g. `DEVCON2025`) to be routed to `/organizer`.

> Auth is fully mocked — any email/password works. Real Supabase integration is the next sprint.

---

## 4. App Structure — What's Built

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

---

## 5. Program Themes

Users can switch their app theme from the Profile screen. The primary color drives all `bg-primary`, `text-primary`, and shadow tokens via CSS custom properties.

| Theme | Color |
|-------|-------|
| DEVCON+ (default) | `#367BDD` blue |
| She is DEVCON | `#EC4899` pink |
| DEVCON Kids | `#21C45D` green |
| Campus | `#F8C630` gold |

---

## 6. Key Design Rules

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
| `blue` | `#367BDD` | Non-themed blue alias |
| `navy` | `#1E2A56` | Dark text, indicator dots |
| `gold` | `#F8C630` | XP bar fill, star icon |
| `promoted` | `#F97316` | PROMOTED badge only |
| `green` | `#21C45D` | Positive XP, success states |
| `red` | `#EF4444` | Error, sign out |

---

## 7. Build + Typecheck

```bash
# Production build
npm run build

# TypeScript check across all packages
npm run typecheck
```

Output: `apps/member/dist/`

---

## 8. Folder Structure

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

## 9. Common Issues

**`npm install` fails**
→ Always use `npm install --legacy-peer-deps`

**App shows "Please open on mobile"**
→ Open DevTools → Toggle Device Toolbar → set width to 390px

**Organizer pages redirect to sign-in**
→ From sign-up, enter an organizer code to set the organizer session flag

**TypeScript errors after pulling**
→ Run `npm install --legacy-peer-deps` — a new package may have been added

**QR scanner says "camera not available"**
→ Requires HTTPS or `localhost`. Works at `localhost:5173` — use Chrome on Android or desktop for scanning

---

## 10. Deployment (Vercel)

| Project | Root Directory | Build Command | Output |
|---------|---------------|---------------|--------|
| Member app | `apps/member` | `npm run build` | `dist` |
| Landing | `apps/landing` | *(none)* | `.` |

See `docs/plans/2026-02-27-pwa-vercel-deployment.md` for full Vercel setup steps.

---

*DEVCON Philippines · React 19 + Vite 7 · MVP Target: April 2026*
