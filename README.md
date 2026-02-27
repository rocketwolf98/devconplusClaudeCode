# DEVCON+ — Developer Setup Guide

> **Tagline:** Sync. Support. Succeed.
> Platform for DEVCON Philippines — 11 chapters, 60,000+ members.

This monorepo contains two apps and one shared package:

| App | Tech | Purpose |
|-----|------|---------|
| `apps/member` | React + Vite PWA | Mobile-first web app for members |
| `apps/organizer` | React + Vite PWA | Web PWA for chapter officers |
| `packages/supabase` | TypeScript | Shared types + mock data |

---

## Prerequisites

Install these before anything else.

| Tool | Required Version | Download |
|------|-----------------|---------|
| Node.js | **v20.x** (LTS) | https://nodejs.org |
| npm | v10+ (comes with Node) | — |
| Git | any recent version | https://git-scm.com |

> **Windows users:** Use **Git Bash** or **WSL** for all terminal commands — not Command Prompt or PowerShell.

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd "devcon-plus"

npm install
```

---

## 2. Running the Apps

### Member App (Vite PWA)

```bash
npm run dev:member
```

Opens at [http://localhost:5173](http://localhost:5173) (or next available port if 5173 is taken).

> Use Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M) to simulate a mobile viewport.

### Organizer PWA

```bash
npm run dev:organizer
```

Opens at [http://localhost:5173](http://localhost:5173)

> If both apps run at the same time, the member app will use port 5174.

### Run both at the same time

```bash
npm run dev
```

---

## 3. Login Credentials (Mock Data — No Backend Yet)

All data is mocked. Use these to log in:

### Member App
| Field | Value |
|-------|-------|
| Email | `juan@example.com` |
| Password | any value (not validated yet) |

### Organizer PWA
| Field | Value |
|-------|-------|
| Email | `officer@devcon.ph` |
| Password | any value (not validated yet) |

> Auth is mocked — any email/password combination will work at this stage. Real Supabase integration comes in a later sprint.

---

## 4. App Structure — What's Built

### Member App Screens

| Route | Screen |
|-------|--------|
| `/onboarding` | 4-step swipeable intro |
| `/sign-in` | Login |
| `/sign-up` | Registration (includes organizer code gate) |
| `/` | Dashboard — hero banner, XP bar, events, jobs, news |
| `/events` | Events list with chapter filter tabs |
| `/events/:id` | Event detail |
| `/events/:id/register` | Registration form (pre-filled) |
| `/events/:id/pending` | Pending approval screen |
| `/events/:id/ticket` | QR ticket |
| `/jobs` | Jobs board with search + filter |
| `/jobs/:id` | Job detail + Apply Now |
| `/points` | Ways to Earn / Share & Earn tabs |
| `/points/history` | Transaction log grouped by date |
| `/rewards` | Perks catalog (ComingSoonModal on tap) |
| `/profile` | Profile overview |
| `/profile/edit` | Edit profile |
| `/profile/notifications` | Notification settings |
| `/profile/privacy` | Privacy settings |

### Organizer PWA Screens

| Route | Screen |
|-------|--------|
| `/login` | Officer login |
| `/` | Dashboard — pending approvals + event summary |
| `/events` | Events list |
| `/events/create` | Create new event |
| `/events/:id` | Event detail |
| `/events/:id/registrants` | Approve / Reject registrants |
| `/scan` | QR scanner (camera) |
| `/profile` | Officer profile |

---

## 5. Key Design Rules (Read Before Making Changes)

1. **No Apple Sign-In** — auth is Google OAuth + Email/Password only
2. **2nd job listing + 2nd news post** always get an orange `PROMOTED` badge — this is a design mandate
3. **No placeholder text** — use `<ComingSoonModal />` for incomplete features
4. **Every tap must go somewhere** — no dead-end navigation
5. **TypeScript strict mode** — no `any` types, no `@ts-ignore`
6. **Forms** use React Hook Form + Zod — no uncontrolled inputs

### Color Reference

| Token | Hex | Usage |
|-------|-----|-------|
| Primary blue | `#3B5BDE` | Buttons, active nav, headers |
| Navy | `#1E2A56` | Dark backgrounds, hero |
| Promoted orange | `#F97316` | PROMOTED badge only |
| Success green | `#21C45D` | "You're In" states |
| Warning yellow | `#EAB308` | Pending states |
| Error red | `#EF4444` | Rejected states |

---

## 6. Making a Production Build

### Member App

```bash
cd apps/member
npm run build
# Output: apps/member/dist/
```

### Organizer PWA

```bash
cd apps/organizer
npm run build
# Output: apps/organizer/dist/
```

### TypeScript check (both apps)

```bash
npm run typecheck
```

---

## 7. Project Conventions

- `PascalCase.tsx` for components
- `kebab-case.tsx` for route page files
- Mock data lives in `packages/supabase/src/mock/`
- Stores (Zustand) live in `src/stores/` inside each app
- Components live in `src/components/` inside each app

---

## 8. Folder Structure

```
devcon-plus/
├── apps/
│   ├── member/              # Vite React PWA (member app)
│   │   └── src/
│   │       ├── components/  # Shared UI components
│   │       ├── pages/       # Route pages (auth/, dashboard/, events/, etc.)
│   │       └── stores/      # Zustand state
│   ├── organizer/           # Vite React PWA (organizer app)
│   │   └── src/
│   │       ├── components/  # Layout, cards
│   │       ├── pages/       # Route pages
│   │       └── stores/      # Zustand state
│   └── landing/             # Static landing page (HTML only)
└── packages/
    └── supabase/            # Shared types + mock data
```

---

## 9. Common Issues

**`npm install` fails**
→ Make sure you're using Node.js v20.x. Run `node -v` to check.

**Member app not loading**
→ Open [http://localhost:5173](http://localhost:5173) directly in Chrome. If that port is taken, check the terminal for the actual port (e.g. 5174).

**Organizer app shows login page in a loop**
→ Clear `localStorage` in DevTools → Application → Local Storage → Clear All

**TypeScript errors after pulling changes**
→ Run `npm install` again — a new package may have been added

**QR scanner says "camera not available"**
→ The QR scanner requires HTTPS or localhost. It works on `localhost:5173` but will fail on `http://` deployed URLs — use Chrome on Android or desktop for scanning

---

## 10. Deployment (Vercel)

Three separate Vercel projects from the same repo:

| Project | Root Directory | Build Command | Output |
|---------|---------------|---------------|--------|
| Landing | `apps/landing` | *(none)* | `.` |
| Member app | `apps/member` | `npm run build` | `dist` |
| Organizer | `apps/organizer` | `npm run build` | `dist` |

See `docs/plans/2026-02-27-pwa-vercel-deployment.md` for full Vercel setup steps.

---

*DEVCON Philippines · Built with React + Vite · MVP Target: April 2026*
