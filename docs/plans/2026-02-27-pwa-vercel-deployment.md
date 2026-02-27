# PWA + Vercel Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy both apps as PWAs on Vercel with a shared landing page, and transform the organizer portal into a mobile-first experience with a bottom nav.

**Architecture:** Three Vercel projects (landing, member, organizer) all connected to the same GitHub repo. Each auto-deploys on push. No service workers for MVP — online-only. The organizer sidebar is replaced with a mobile bottom nav matching the member app's CustomTabBar pattern.

**Tech Stack:** Expo web (static export), Vite (static build), plain HTML/CSS (landing), Vercel

**Design reference:** `docs/plans/2026-02-27-pwa-vercel-deployment-design.md`

---

## Task 1: Create the Landing Page

**Files:**
- Create: `apps/landing/index.html`
- Create: `apps/landing/vercel.json`

**No test needed** — visual page. Verify manually after task.

**Step 1: Create `apps/landing/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1E2A4A" />
    <title>DEVCON+ — Sync. Support. Succeed.</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #1E2A4A;
        min-height: 100svh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .card {
        background: #ffffff;
        border-radius: 24px;
        padding: 40px 32px;
        width: 100%;
        max-width: 360px;
        text-align: center;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
      }

      .logo {
        width: 64px;
        height: 64px;
        background: #3B82F6;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        font-weight: 900;
        color: white;
        margin: 0 auto 20px;
      }

      h1 {
        font-size: 28px;
        font-weight: 900;
        color: #0F172A;
        letter-spacing: -0.5px;
        line-height: 1.2;
      }

      .tagline {
        font-size: 14px;
        color: #64748B;
        margin-top: 8px;
        margin-bottom: 36px;
      }

      .btn {
        display: block;
        width: 100%;
        padding: 14px 20px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 700;
        text-decoration: none;
        transition: opacity 0.15s, transform 0.1s;
        cursor: pointer;
        border: none;
      }
      .btn:active { transform: scale(0.98); opacity: 0.9; }

      .btn-primary {
        background: #3B82F6;
        color: #ffffff;
        margin-bottom: 12px;
      }

      .btn-secondary {
        background: #F1F5F9;
        color: #1E2A4A;
      }

      .btn-label {
        display: block;
        font-size: 11px;
        font-weight: 500;
        opacity: 0.7;
        margin-top: 3px;
        letter-spacing: 0.3px;
      }

      .footer {
        margin-top: 28px;
        font-size: 12px;
        color: #94A3B8;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">D+</div>
      <h1>DEVCON+</h1>
      <p class="tagline">Sync. Support. Succeed.</p>

      <a href="https://devcon-plus-member.vercel.app" class="btn btn-primary">
        I'm a Member
        <span class="btn-label">Register for events · Earn points · Browse jobs</span>
      </a>

      <a href="https://devcon-plus-org.vercel.app" class="btn btn-secondary">
        I'm an Officer
        <span class="btn-label">Manage events · Scan QR · Approve registrations</span>
      </a>

      <p class="footer">DEVCON Philippines · 11 Chapters · 60,000+ Members</p>
    </div>
  </body>
</html>
```

**Step 2: Create `apps/landing/vercel.json`**

```json
{
  "cleanUrls": true
}
```

**Step 3: Verify manually**

Open `apps/landing/index.html` directly in a browser. Should show the landing card with two buttons. Check on mobile viewport (DevTools → toggle device).

**Step 4: Commit**

```bash
git add apps/landing/
git commit -m "feat: add landing page for devconplus.vercel.app"
```

---

## Task 2: Configure Member App for PWA Static Export

**Files:**
- Modify: `apps/member/app.json`
- Create: `apps/member/vercel.json`

**Step 1: Update `apps/member/app.json` web section**

Replace the existing `"web"` block:

```json
"web": {
  "bundler": "metro",
  "output": "static",
  "favicon": "./assets/favicon.png",
  "name": "DEVCON+",
  "shortName": "DEVCON+",
  "description": "The Philippines' Largest Volunteer Tech Community",
  "themeColor": "#1E2A4A",
  "backgroundColor": "#1E2A4A",
  "lang": "en"
}
```

The `"output": "static"` is the critical change — it makes `expo export --platform web` produce a static site instead of a server-rendered one.

**Step 2: Test that the export works**

```bash
cd apps/member
npx expo export --platform web
```

Expected: Creates a `dist/` folder with `index.html` and static assets. No errors.

**Step 3: Create `apps/member/vercel.json`**

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This tells Vercel: how to build, where the output is, and to serve `index.html` for any path (SPA routing).

**Step 4: Commit**

```bash
git add apps/member/app.json apps/member/vercel.json
git commit -m "feat: configure member app for PWA static export and Vercel"
```

---

## Task 3: Configure Organizer App for PWA + Vercel

**Files:**
- Modify: `apps/organizer/index.html`
- Create: `apps/organizer/public/manifest.json`
- Create: `apps/organizer/vercel.json`

**Step 1: Create `apps/organizer/public/manifest.json`**

```json
{
  "name": "DEVCON+ Organizer",
  "short_name": "DEVCON+ Org",
  "description": "Chapter Officer & Admin Portal for DEVCON Philippines",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1E2A4A",
  "theme_color": "#1E2A4A",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "any",
      "type": "image/x-icon"
    }
  ]
}
```

**Step 2: Update `apps/organizer/index.html`**

Replace the entire file:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1E2A4A" />
    <meta name="description" content="Chapter Officer & Admin Portal for DEVCON Philippines" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="DEVCON+ Org" />
    <link rel="manifest" href="/manifest.json" />
    <title>DEVCON+ Organizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 3: Create `apps/organizer/vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 4: Test the build**

```bash
cd apps/organizer
npm run build
```

Expected: `dist/` folder created. No TypeScript or Vite errors.

**Step 5: Commit**

```bash
git add apps/organizer/index.html apps/organizer/public/manifest.json apps/organizer/vercel.json
git commit -m "feat: configure organizer app as PWA for Vercel deployment"
```

---

## Task 4: Replace Organizer Sidebar with Mobile Bottom Nav

**Files:**
- Modify: `apps/organizer/src/components/Layout.tsx`

This is the main UI change. The sidebar (`w-60 aside`) is replaced with:
1. A thin top header (logo + user avatar)
2. A fixed bottom nav bar matching the member app's CustomTabBar pattern

The 4 nav items in order: Dashboard (0), Events (1), **QR Scanner (2 — center hero)**, Profile (3).

**Step 1: Rewrite `apps/organizer/src/components/Layout.tsx`**

```tsx
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

const NAV_ITEMS = [
  { to: '/', icon: '📊', label: 'Home', end: true },
  { to: '/events', icon: '🎟️', label: 'Events', end: false },
  { to: '/scan', icon: '📷', label: null, end: false }, // center hero
  { to: '/profile', icon: '👤', label: 'Profile', end: false },
]

export function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user) {
    navigate('/login')
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (to: string, end: boolean) => {
    if (end) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F8FAFC', overflow: 'hidden' }}>
      {/* Top header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: '#3B82F6', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 13,
          }}>
            D+
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>DEVCON+</p>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Organizer Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(59,130,246,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3B82F6', fontSize: 11, fontWeight: 700,
          }}>
            {user.initials}
          </div>
          <button
            onClick={handleLogout}
            style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <Outlet />
      </main>

      {/* Bottom nav — mirrors member app CustomTabBar pattern */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#ffffff',
        borderTop: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center',
        paddingTop: 10, paddingBottom: 10,
        zIndex: 20,
      }}>
        {NAV_ITEMS.map((item, index) => {
          const active = isActive(item.to, item.end)
          const isCenter = index === 2

          if (isCenter) {
            return (
              <div key={item.to} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <NavLink to={item.to} style={{ textDecoration: 'none' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 26,
                    background: active ? '#1E2A4A' : '#3B82F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: -20,
                    boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                  }}>
                    <span style={{ fontSize: 22 }}>{item.icon}</span>
                  </div>
                </NavLink>
              </div>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none' }}
            >
              <span style={{ fontSize: 20, lineHeight: '24px' }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#3B82F6' : '#94A3B8' }}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
```

**Step 2: Verify the organizer builds without errors**

```bash
cd apps/organizer
npm run typecheck
npm run build
```

Expected: No TypeScript errors. `dist/` built successfully.

**Step 3: Run the organizer dev server and verify visually**

```bash
npm run dev:organizer
```

Open `localhost:5173`. Should show:
- Top header with D+ logo and user initials
- Bottom nav with 4 items: Home, Events, center Scan circle, Profile
- Center Scan button is elevated above the nav bar
- Tapping nav items navigates correctly
- No sidebar visible

**Step 4: Commit**

```bash
git add apps/organizer/src/components/Layout.tsx
git commit -m "feat: replace organizer sidebar with mobile bottom nav"
```

---

## Task 5: Update Organizer Page Layouts for Mobile

**Files:**
- Modify: `apps/organizer/src/pages/Dashboard.tsx` — `max-w-4xl` → `max-w-lg`
- Modify: `apps/organizer/src/pages/events/EventsList.tsx`
- Modify: `apps/organizer/src/pages/events/EventCreate.tsx`
- Modify: `apps/organizer/src/pages/events/EventDetail.tsx`
- Modify: `apps/organizer/src/pages/events/EventRegistrants.tsx`
- Modify: `apps/organizer/src/pages/scan/QRScanner.tsx`
- Modify: `apps/organizer/src/pages/profile/Profile.tsx`

**Step 1: Read each page file**

Open each file listed above and check its outer container class. They likely have `max-w-4xl mx-auto` or similar.

**Step 2: Change max-width to mobile-first**

For each page, change the outer padding container from:
```tsx
<div className="p-6 max-w-4xl mx-auto">
```
to:
```tsx
<div className="p-4 max-w-lg mx-auto">
```

- `max-w-lg` = 512px — full width on mobile, nicely centered on desktop
- `p-4` (16px) instead of `p-6` (24px) — tighter on mobile

**Step 3: Verify all pages render correctly**

With `npm run dev:organizer` running, navigate to each route:
- `/` — Dashboard
- `/events` — Events list
- `/events/create` — Create form
- `/scan` — QR scanner
- `/profile` — Profile

Check each at 390px viewport width (iPhone size in DevTools).

**Step 4: Commit**

```bash
git add apps/organizer/src/pages/
git commit -m "feat: update organizer pages to mobile-first layout"
```

---

## Task 6: Vercel Setup (Manual — No Code)

These are manual steps in the Vercel dashboard. Do these after all code is pushed to GitHub.

**Step 1: Push all code**

```bash
git push origin main
```

**Step 2: Create Vercel project for landing page**

1. Go to vercel.com → "Add New Project"
2. Import your GitHub repo
3. Set **Root Directory**: `apps/landing`
4. Framework Preset: **Other**
5. Build command: *(leave blank — static HTML)*
6. Output directory: `.` *(current directory)*
7. Deploy → note the URL (e.g. `devcon-plus-landing.vercel.app`)
8. In Project Settings → rename to a memorable name

**Step 3: Create Vercel project for member app**

1. "Add New Project" → same GitHub repo
2. Root Directory: `apps/member`
3. Framework Preset: **Other** (Expo web isn't auto-detected)
4. Build command: `npx expo export --platform web`
5. Output directory: `dist`
6. Node.js version: 20.x
7. Deploy

**Step 4: Create Vercel project for organizer app**

1. "Add New Project" → same GitHub repo
2. Root Directory: `apps/organizer`
3. Framework Preset: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

**Step 5: Update landing page URLs**

Once you have the member and organizer Vercel URLs, update them in `apps/landing/index.html`:

```html
<!-- Replace these placeholder URLs with the real Vercel URLs -->
<a href="https://YOUR-MEMBER-URL.vercel.app" ...>
<a href="https://YOUR-ORGANIZER-URL.vercel.app" ...>
```

Then push → landing page auto-redeploys.

---

## Verification Checklist

After all tasks complete:

- [ ] Landing page loads at Vercel URL
- [ ] Landing page "I'm a Member" button links to member app
- [ ] Landing page "I'm an Officer" button links to organizer app
- [ ] Member app loads at its Vercel URL
- [ ] Member app tab bar shows on mobile viewport
- [ ] Chrome Android shows "Add to Home Screen" prompt for member app
- [ ] Organizer app loads at its Vercel URL
- [ ] Organizer bottom nav shows with center Scan button elevated
- [ ] Organizer nav items navigate correctly
- [ ] Chrome Android shows "Add to Home Screen" prompt for organizer app
- [ ] Both apps look correct on 390px viewport (iPhone SE size)
