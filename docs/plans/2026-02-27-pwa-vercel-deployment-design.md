# PWA + Vercel Deployment Design
**Date:** 2026-02-27
**Status:** Approved
**Scope:** Both apps (member + organizer) deployed as PWAs on Vercel with a shared landing page

---

## Goals

1. Zero installation friction — share a URL, app opens instantly in any mobile browser
2. Mobile-first experience for both member and organizer
3. Sustainable — deploy once, all users get updates on next visit
4. Single entry URL that self-directs members vs. officers

---

## Architecture

Three Vercel projects, one GitHub repo.

```
GitHub: devcon-plus (monorepo)
    │
    ├── apps/landing/   → devconplus.vercel.app          (landing page)
    ├── apps/member/    → devcon-plus-member.vercel.app  (member PWA)
    └── apps/organizer/ → devcon-plus-org.vercel.app     (organizer PWA)
```

Each Vercel project is configured with its own `Root Directory` setting pointing to the respective `apps/*` folder. All three auto-deploy on `git push` when files in their directory change.

---

## Landing Page (`apps/landing/`)

Plain HTML + CSS — no framework. Fast-loading, mobile-first.

**Design:**
- DEVCON+ logo + tagline ("Sync. Support. Succeed.")
- Two large buttons: "I'm a Member" → member app URL, "I'm an Officer" → organizer app URL
- Brand colors: `#1E2A4A` navy background, `#3B82F6` blue buttons
- Vercel project: `devconplus.vercel.app`

**Files:**
- `apps/landing/index.html`
- `apps/landing/style.css`
- `apps/landing/vercel.json` (no rewrites needed — single page)

---

## Member App PWA (`apps/member/`)

Expo web export → static PWA.

**Changes:**
- `app.json` → set `web.output: "static"`, add `web.name`, `web.shortName`, `web.themeColor: "#1E2A4A"`, `web.backgroundColor: "#1E2A4A"`
- `vercel.json` → rewrite all paths to `/index.html` (SPA routing)
- Build command: `npx expo export --platform web`
- Output directory: `dist`

**PWA installability:** `app.json` web config auto-generates `manifest.json` during expo export. No additional setup needed.

---

## Organizer PWA (`apps/organizer/`)

Vite build → static PWA, mobile-first redesign.

**Changes:**
- `public/manifest.json` → PWA manifest (name, icons, theme_color, display: standalone)
- `index.html` → link manifest, add `<meta name="viewport">` with `viewport-fit=cover`
- `vercel.json` → rewrite all paths to `/index.html` (SPA routing)
- `src/components/Layout.tsx` → replace sidebar with mobile bottom nav

**Organizer bottom nav (mirrors member app pattern):**
```
[🏠 Home] [📋 Events] [● 📷 SCAN ●] [👤 Profile]
```
- Same visual style as member app's `CustomTabBar`
- Center elevated circle button = Scan (primary officer action)
- 4 items total (no Rewards or Jobs — organizer-specific)
- Active state uses same blue highlight system

**Page layout changes:**
- All pages: `max-w-lg mx-auto` container (readable on desktop, full-width on mobile)
- Remove sidebar-dependent padding/margins
- Ensure all touch targets are ≥ 44px

---

## Vercel Setup (Manual Steps)

After code is ready:

1. Push code to GitHub
2. In Vercel dashboard → "Add New Project" × 3
3. For each project:
   - Import same GitHub repo
   - Set **Root Directory**: `apps/landing`, `apps/member`, `apps/organizer`
   - Set build commands as specified above
4. Deploy

---

## Out of Scope

- Custom domain (add later when domain is registered)
- Service workers / offline mode (post-MVP)
- Push notifications (post-MVP per CLAUDE.md)
- iOS App Store / Google Play Store listing (post-MVP)
