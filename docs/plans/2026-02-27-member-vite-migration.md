# Member App Vite Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `apps/member` Expo/React Native app with a React + Vite PWA using the same design system and mock data as the organizer app — no Expo, no React Native, no `--legacy-peer-deps`.

**Architecture:** Delete all Expo-specific files in-place, scaffold a fresh Vite project at `apps/member/`, then port every screen from React Native JSX to HTML + Tailwind. The organizer app (`apps/organizer/`) is the exact config reference. Stores are copy-paste unchanged (already browser-compatible). All data stays mocked via `@devcon-plus/supabase`.

**Tech Stack:** React 19, Vite 7, React Router v7 (react-router-dom), Tailwind CSS v3, Zustand v5, qrcode.react, TypeScript strict. No tests — this is a UI migration; verification = `npm run build` passes + `npm run dev` visual check.

---

### Task 1: Delete Expo files and scaffold new Vite config

**Files:**
- Delete: `apps/member/app/`, `apps/member/components/`, `apps/member/constants/`, `apps/member/app.json`, `apps/member/babel.config.js`, `apps/member/metro.config.js`, `apps/member/.expo/`, `apps/member/node_modules/`
- Create: `apps/member/package.json`
- Create: `apps/member/vite.config.ts`
- Create: `apps/member/tailwind.config.js`
- Create: `apps/member/postcss.config.js`
- Create: `apps/member/tsconfig.json`
- Create: `apps/member/tsconfig.app.json`
- Create: `apps/member/tsconfig.node.json`

**Step 1: Delete all Expo-specific files**

Run from the monorepo root (`devcon-plus/`):
```bash
rm -rf apps/member/app apps/member/components apps/member/constants apps/member/.expo apps/member/node_modules
rm -f apps/member/app.json apps/member/babel.config.js apps/member/metro.config.js apps/member/package.json apps/member/tsconfig.json
```

**Step 2: Create `apps/member/package.json`**

```json
{
  "name": "@devcon-plus/member",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@devcon-plus/supabase": "*",
    "@hookform/resolvers": "^3.10.0",
    "@supabase/supabase-js": "^2.49.1",
    "qrcode.react": "^4.2.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.56.1",
    "react-router-dom": "^7.6.2",
    "zod": "^3.24.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.9.3",
    "vite": "^7.3.1"
  }
}
```

**Step 3: Create `apps/member/vite.config.ts`** (identical to organizer)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
```

**Step 4: Create `apps/member/tailwind.config.js`** (identical to organizer)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: '#3B5BDE',
          dark: '#2F48C0',
          light: '#5B7BF8',
        },
        navy: '#1E2A56',
        gold: '#F8C630',
        promoted: '#F97316',
        green: '#21C45D',
        red: '#EF4444',
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.07)',
        blue: '0 4px 24px rgba(59,91,222,0.12)',
      },
    },
  },
  plugins: [],
}
```

**Step 5: Create `apps/member/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 6: Create `apps/member/tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `apps/member/tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

Create `apps/member/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 7: Install from monorepo root**

```bash
npm install
```

Expected: Exits successfully. `apps/member/node_modules/` populated with react, vite, etc.

**Step 8: Commit**

```bash
git add apps/member/package.json apps/member/vite.config.ts apps/member/tailwind.config.js apps/member/postcss.config.js apps/member/tsconfig.json apps/member/tsconfig.app.json apps/member/tsconfig.node.json
git commit -m "chore(member): replace Expo config with Vite scaffold"
```

---

### Task 2: Bootstrap index.html, src entry files, and public/manifest.json

**Files:**
- Create: `apps/member/index.html`
- Create: `apps/member/public/manifest.json`
- Create: `apps/member/src/index.css`
- Create: `apps/member/src/main.tsx`
- Create: `apps/member/src/App.tsx`

**Step 1: Create `apps/member/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1E2A56" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.json" />
    <title>DEVCON+</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Create `apps/member/public/manifest.json`**

```json
{
  "name": "DEVCON+",
  "short_name": "DEVCON+",
  "description": "The Philippines' Largest Volunteer Tech Community",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1E2A56",
  "theme_color": "#1E2A56",
  "icons": [
    {
      "src": "/favicon.png",
      "sizes": "any",
      "type": "image/png"
    }
  ]
}
```

**Step 3: Create `apps/member/src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  background-color: #F8FAFC;
  font-family: 'Geist', system-ui, sans-serif;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

/* PWA safe-area support for notched phones */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

**Step 4: Create `apps/member/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 5: Create `apps/member/src/App.tsx`** (placeholder until router is wired in Task 4)

```tsx
export default function App() {
  return <div className="p-4 text-slate-900">DEVCON+ — loading…</div>
}
```

**Step 6: Verify dev server starts**

```bash
cd apps/member && npm run dev
```

Expected: Vite starts at `http://localhost:5173`. Browser shows "DEVCON+ — loading…" with no console errors.

**Step 7: Commit**

```bash
git add apps/member/index.html apps/member/public/manifest.json apps/member/src/
git commit -m "feat(member): bootstrap Vite entry point, CSS, manifest"
```

---

### Task 3: Create MemberLayout (5-tab bottom nav)

**Files:**
- Create: `apps/member/src/components/MemberLayout.tsx`

The 5-tab bar order: `Events | Jobs | [● Dashboard] | Points | Profile`. The center Dashboard tab is an elevated circle that rises above the bar. All tab routes render `<Outlet />` inside this layout. Auth routes (`/onboarding`, `/sign-in`, `/sign-up`) do NOT use this layout.

**Step 1: Create `apps/member/src/components/MemberLayout.tsx`**

```tsx
import { Outlet, NavLink } from 'react-router-dom'

const LEFT_TABS = [
  { path: '/events', label: 'Events', icon: '🎟️' },
  { path: '/jobs', label: 'Jobs', icon: '💼' },
]

const RIGHT_TABS = [
  { path: '/points', label: 'Points', icon: '⭐' },
  { path: '/profile', label: 'Profile', icon: '👤' },
]

export default function MemberLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-lg mx-auto">
      {/* Scrollable page content — leave room for the 72px bottom nav */}
      <div className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </div>

      {/* Fixed bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-200 z-50"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex items-end justify-around h-[72px] px-2 relative">
          {/* Left: Events + Jobs */}
          {LEFT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 pt-2 pb-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}

          {/* Center: Dashboard hero circle — elevated above nav bar */}
          <NavLink
            to="/"
            end
            className="flex-1 flex justify-center items-end pb-2"
            title="Dashboard"
          >
            <div
              className="w-14 h-14 rounded-full bg-blue flex items-center justify-center shadow-blue relative -top-4"
              style={{ border: '3px solid white' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
          </NavLink>

          {/* Right: Points + Profile */}
          {RIGHT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 pt-2 pb-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/member/src/components/MemberLayout.tsx
git commit -m "feat(member): add MemberLayout with 5-tab bottom nav"
```

---

### Task 4: Create router.tsx + wire App.tsx + stub all page files

**Files:**
- Create: `apps/member/src/router.tsx`
- Modify: `apps/member/src/App.tsx`
- Create: all 18 page stubs under `apps/member/src/pages/`

**Step 1: Create `apps/member/src/router.tsx`**

```tsx
import { createBrowserRouter } from 'react-router-dom'
import MemberLayout from './components/MemberLayout'

// Auth pages (no tab nav)
import Onboarding from './pages/auth/Onboarding'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'

// Tab pages
import Dashboard from './pages/dashboard/Dashboard'
import EventsList from './pages/events/EventsList'
import EventDetail from './pages/events/EventDetail'
import EventRegister from './pages/events/EventRegister'
import EventPending from './pages/events/EventPending'
import EventTicket from './pages/events/EventTicket'
import JobsList from './pages/jobs/JobsList'
import JobDetail from './pages/jobs/JobDetail'
import Points from './pages/points/Points'
import PointsHistory from './pages/points/PointsHistory'
import Rewards from './pages/rewards/Rewards'
import Profile from './pages/profile/Profile'
import ProfileEdit from './pages/profile/ProfileEdit'
import Notifications from './pages/profile/Notifications'
import Privacy from './pages/profile/Privacy'

export const router = createBrowserRouter([
  // Auth routes — no MemberLayout
  { path: '/onboarding', element: <Onboarding /> },
  { path: '/sign-in',    element: <SignIn /> },
  { path: '/sign-up',    element: <SignUp /> },

  // App routes — all wrapped in MemberLayout with bottom tab nav
  {
    element: <MemberLayout />,
    children: [
      { path: '/',                          element: <Dashboard /> },
      { path: '/events',                    element: <EventsList /> },
      { path: '/events/:id',                element: <EventDetail /> },
      { path: '/events/:id/register',       element: <EventRegister /> },
      { path: '/events/:id/pending',        element: <EventPending /> },
      { path: '/events/:id/ticket',         element: <EventTicket /> },
      { path: '/jobs',                      element: <JobsList /> },
      { path: '/jobs/:id',                  element: <JobDetail /> },
      { path: '/points',                    element: <Points /> },
      { path: '/points/history',            element: <PointsHistory /> },
      { path: '/rewards',                   element: <Rewards /> },
      { path: '/profile',                   element: <Profile /> },
      { path: '/profile/edit',              element: <ProfileEdit /> },
      { path: '/profile/notifications',     element: <Notifications /> },
      { path: '/profile/privacy',           element: <Privacy /> },
    ],
  },
])
```

**Step 2: Update `apps/member/src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function App() {
  return <RouterProvider router={router} />
}
```

**Step 3: Create stub files for every page**

For each path below, create the file with a minimal stub. The stub must export a default function component. Replace `PageName` with the actual component name.

Stub template:
```tsx
export default function PageName() {
  return <div className="p-4 text-slate-500">PageName — coming soon</div>
}
```

Files to create:
```
apps/member/src/pages/auth/Onboarding.tsx
apps/member/src/pages/auth/SignIn.tsx
apps/member/src/pages/auth/SignUp.tsx
apps/member/src/pages/dashboard/Dashboard.tsx
apps/member/src/pages/events/EventsList.tsx
apps/member/src/pages/events/EventDetail.tsx
apps/member/src/pages/events/EventRegister.tsx
apps/member/src/pages/events/EventPending.tsx
apps/member/src/pages/events/EventTicket.tsx
apps/member/src/pages/jobs/JobsList.tsx
apps/member/src/pages/jobs/JobDetail.tsx
apps/member/src/pages/points/Points.tsx
apps/member/src/pages/points/PointsHistory.tsx
apps/member/src/pages/rewards/Rewards.tsx
apps/member/src/pages/profile/Profile.tsx
apps/member/src/pages/profile/ProfileEdit.tsx
apps/member/src/pages/profile/Notifications.tsx
apps/member/src/pages/profile/Privacy.tsx
```

**Step 4: Verify build compiles**

```bash
npm run build
```

Expected: Exit code 0. No TypeScript errors. `dist/` folder created with `index.html` and hashed JS bundle.

**Step 5: Commit**

```bash
git add apps/member/src/router.tsx apps/member/src/App.tsx apps/member/src/pages/
git commit -m "feat(member): add React Router config + stub pages — app compiles"
```

---

### Task 5: Move stores to src/stores/

**Files:**
- Create: `apps/member/src/stores/useAuthStore.ts`
- Create: `apps/member/src/stores/useEventsStore.ts`
- Create: `apps/member/src/stores/useJobsStore.ts`
- Create: `apps/member/src/stores/usePointsStore.ts`
- Delete: `apps/member/stores/` directory

The stores are already browser-compatible Zustand. Copy verbatim — no logic changes.

**Step 1: Create `apps/member/src/stores/useAuthStore.ts`**

Copy `apps/member/stores/useAuthStore.ts` exactly. The store uses `user` (not `profile`) as the key, `initials`, `isLoading`, `signIn`, `signOut`. MOCK_PROFILE is pre-loaded so the app starts authenticated.

Important: all pages that use auth data must access `state.user` not `state.profile`.

**Step 2: Create `apps/member/src/stores/useEventsStore.ts`**

```ts
import { create } from 'zustand'
import type { Event, EventRegistration } from '@devcon-plus/supabase'
import { EVENTS } from '@devcon-plus/supabase'

interface EventsState {
  events: Event[]
  registrations: EventRegistration[]
  register: (eventId: string) => void
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: EVENTS,
  registrations: [],

  register: (eventId: string) => {
    const event = get().events.find((e) => e.id === eventId)
    if (!event) return
    const reg: EventRegistration = {
      id: `reg-${Date.now()}`,
      event_id: eventId,
      user_id: 'user-marie-santos',
      status: event.requires_approval ? 'pending' : 'approved',
      qr_code_token: event.requires_approval ? null : `DCN-${Date.now()}`,
      registered_at: new Date().toISOString(),
      approved_at: event.requires_approval ? null : new Date().toISOString(),
    }
    set((s) => ({ registrations: [...s.registrations, reg] }))
  },
}))
```

**Step 3: Create `apps/member/src/stores/useJobsStore.ts`**

```ts
import { create } from 'zustand'
import type { Job } from '@devcon-plus/supabase'
import { JOBS } from '@devcon-plus/supabase'

interface JobsState {
  jobs: Job[]
  savedIds: string[]
  toggleSave: (id: string) => void
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: JOBS,
  savedIds: [],

  toggleSave: (id: string) => {
    const { savedIds } = get()
    set({
      savedIds: savedIds.includes(id)
        ? savedIds.filter((s) => s !== id)
        : [...savedIds, id],
    })
  },
}))
```

**Step 4: Create `apps/member/src/stores/usePointsStore.ts`**

```ts
import { create } from 'zustand'
import type { PointTransaction } from '@devcon-plus/supabase'
import { TRANSACTIONS, MOCK_PROFILE } from '@devcon-plus/supabase'

interface PointsState {
  totalPoints: number
  transactions: PointTransaction[]
}

export const usePointsStore = create<PointsState>(() => ({
  totalPoints: MOCK_PROFILE.total_points,
  transactions: TRANSACTIONS,
}))
```

**Step 5: Delete old stores directory**

```bash
rm -rf apps/member/stores
```

**Step 6: Commit**

```bash
git add apps/member/src/stores/
git commit -m "feat(member): move Zustand stores to src/stores/ — no logic changes"
```

---

### Task 6: Build shared UI components

**Files (all in `apps/member/src/components/`):**
- Create: `PromotedBadge.tsx`
- Create: `StatusPill.tsx`
- Create: `ChipBar.tsx`
- Create: `ComingSoonModal.tsx`
- Create: `XPCard.tsx`
- Create: `EventCard.tsx`
- Create: `JobCard.tsx`
- Create: `NewsCard.tsx`
- Create: `TransactionRow.tsx`

Build smallest-to-largest. Each is pure HTML + Tailwind — no React Native imports.

**Step 1: `PromotedBadge.tsx`**

```tsx
export default function PromotedBadge() {
  return (
    <span className="bg-promoted text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
      Promoted
    </span>
  )
}
```

**Step 2: `StatusPill.tsx`**

```tsx
type Status = 'pending' | 'approved' | 'rejected' | 'upcoming' | 'ongoing' | 'past'

const styles: Record<Status, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green/10 text-green',
  rejected: 'bg-red/10 text-red',
  upcoming: 'bg-blue/10 text-blue',
  ongoing:  'bg-green/10 text-green',
  past:     'bg-slate-100 text-slate-500',
}

const labels: Record<Status, string> = {
  pending:  'Pending',
  approved: "You're In!",
  rejected: 'Rejected',
  upcoming: 'Upcoming',
  ongoing:  'Ongoing',
  past:     'Past',
}

export default function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
```

**Step 3: `ChipBar.tsx`**

```tsx
interface Props {
  options: string[]
  selected: string
  onChange: (value: string) => void
}

export default function ChipBar({ options, selected, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
            selected === opt
              ? 'bg-blue text-white border-blue'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
```

**Step 4: `ComingSoonModal.tsx`**

```tsx
interface Props {
  onClose: () => void
  feature?: string
}

export default function ComingSoonModal({ onClose, feature = 'This feature' }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-6" />
        <div className="text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Coming Soon</h2>
          <p className="text-sm text-slate-500 mb-6">{feature} is launching soon. Stay tuned!</p>
          <button
            onClick={onClose}
            className="w-full bg-blue text-white font-bold py-3 rounded-xl"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 5: `XPCard.tsx`**

Uses `MOCK_PROFILE_XP_NEXT_MILESTONE` and `MOCK_PROFILE_XP_PROGRESS` from `@devcon-plus/supabase` if available, otherwise computes from `totalPoints`.

```tsx
import { useNavigate } from 'react-router-dom'
import { usePointsStore } from '../stores/usePointsStore'
import { MOCK_PROFILE_XP_NEXT_MILESTONE, MOCK_PROFILE_XP_PROGRESS } from '@devcon-plus/supabase'

export default function XPCard() {
  const navigate = useNavigate()
  const { totalPoints } = usePointsStore()

  return (
    <div className="mx-4 bg-navy rounded-2xl p-4 shadow-blue">
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="text-white/60 text-xs">Your Points</p>
          <p className="text-white text-2xl font-bold">{totalPoints.toLocaleString()} pts</p>
        </div>
        <button
          onClick={() => navigate('/rewards')}
          className="bg-blue px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
        >
          Redeem Now
        </button>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-gold rounded-full transition-all"
          style={{ width: `${MOCK_PROFILE_XP_PROGRESS}%` }}
        />
      </div>
      <p className="text-white/50 text-xs">
        {MOCK_PROFILE_XP_NEXT_MILESTONE.toLocaleString()} pts to next reward tier
      </p>
    </div>
  )
}
```

> **Note:** If `MOCK_PROFILE_XP_NEXT_MILESTONE` / `MOCK_PROFILE_XP_PROGRESS` don't exist as exports (check `packages/supabase/src/mock/index.ts`), replace with inline values: `nextMilestone = 500`, `progress = (totalPoints / 500) * 100`.

**Step 6: `EventCard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import type { Event } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'
import StatusPill from './StatusPill'

export default function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const navigate = useNavigate()
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBA'

  return (
    <button
      onClick={() => navigate(`/events/${event.id}`)}
      className="w-full bg-white rounded-2xl shadow-card p-4 text-left relative overflow-hidden"
    >
      {event.is_promoted && (
        <div className="absolute top-3 right-3 z-10">
          <PromotedBadge />
        </div>
      )}
      {event.cover_image_url ? (
        <img
          src={event.cover_image_url}
          alt={event.title}
          className={`w-full object-cover rounded-xl mb-3 ${compact ? 'h-28' : 'h-36'}`}
        />
      ) : (
        <div className={`w-full rounded-xl mb-3 bg-gradient-to-br from-blue to-navy flex items-center justify-center ${compact ? 'h-28' : 'h-36'}`}>
          <span className="text-white/20 text-5xl">🎪</span>
        </div>
      )}
      <p className="text-xs text-slate-400 mb-0.5">{dateStr}</p>
      <p className="font-semibold text-slate-900 text-sm leading-tight mb-2 pr-12">{event.title}</p>
      <div className="flex items-center gap-2">
        <StatusPill status={event.status as 'upcoming' | 'ongoing' | 'past'} />
        <span className="text-xs text-blue font-semibold">+{event.points_value} pts</span>
      </div>
    </button>
  )
}
```

**Step 7: `JobCard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import type { Job } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'

const workTypeLabel: Record<string, string> = {
  remote:    '🌐 Remote',
  onsite:    '🏢 Onsite',
  hybrid:    '🔀 Hybrid',
  full_time: 'Full-time',
  part_time: 'Part-time',
}

export default function JobCard({ job }: { job: Job }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="w-full bg-white rounded-2xl shadow-card p-4 text-left relative"
    >
      {job.is_promoted && (
        <div className="absolute top-3 right-3">
          <PromotedBadge />
        </div>
      )}
      <p className="font-semibold text-slate-900 text-sm pr-16">{job.title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
          {workTypeLabel[job.work_type] ?? job.work_type}
        </span>
        {job.location && <span className="text-xs text-slate-400">{job.location}</span>}
      </div>
    </button>
  )
}
```

**Step 8: `NewsCard.tsx`**

```tsx
import type { NewsPost } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'

export default function NewsCard({ post }: { post: NewsPost }) {
  const dateStr = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden relative">
      {post.is_promoted && (
        <div className="absolute top-3 right-3 z-10">
          <PromotedBadge />
        </div>
      )}
      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt={post.title} className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-navy to-blue flex items-center justify-center">
          <span className="text-white/20 text-4xl">📰</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-xs text-slate-400 mb-1">{dateStr}</p>
        <p className="font-semibold text-slate-900 text-sm leading-tight">{post.title}</p>
      </div>
    </div>
  )
}
```

**Step 9: `TransactionRow.tsx`**

```tsx
import type { PointTransaction } from '@devcon-plus/supabase'

export default function TransactionRow({ tx }: { tx: PointTransaction }) {
  const isPositive = tx.amount > 0
  const timeStr = tx.created_at
    ? new Date(tx.created_at).toLocaleString('en-PH', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{tx.description}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Transaction no. {tx.transaction_ref} · {timeStr}
        </p>
      </div>
      <p className={`text-sm font-bold ml-4 flex-shrink-0 ${isPositive ? 'text-green' : 'text-red'}`}>
        {isPositive ? '+' : ''}{tx.amount.toLocaleString()} pts
      </p>
    </div>
  )
}
```

**Step 10: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

**Step 11: Commit**

```bash
git add apps/member/src/components/
git commit -m "feat(member): add all shared UI components"
```

---

### Task 7: Port auth pages (Onboarding, SignIn, SignUp)

**Files:**
- Replace: `apps/member/src/pages/auth/Onboarding.tsx`
- Replace: `apps/member/src/pages/auth/SignIn.tsx`
- Replace: `apps/member/src/pages/auth/SignUp.tsx`

These are full-screen pages outside MemberLayout — no bottom nav.

**Step 1: Write `Onboarding.tsx`**

The old RN version used `ScrollView` with `pagingEnabled` + `Dimensions.get('window')`. Replace with a `transform: translateX` CSS slide approach using `useState` for the current index.

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    gradient: 'from-navy via-blue to-blue',
    emoji: '🇵🇭',
    title: "The Philippines' Largest Volunteer Tech Community",
    subtitle: 'DEVCON Philippines',
  },
  {
    gradient: 'from-blue to-navy',
    emoji: '🗺️',
    title: '11 Chapters. 16 Years. 60,000+ Geeks for Good.',
    subtitle: 'Nationwide community',
  },
  {
    gradient: 'from-navy to-blue-dark',
    emoji: '⭐',
    title: 'Volunteer. Earn Points. Unlock Rewards.',
    subtitle: 'Points+ system',
  },
  {
    gradient: 'from-blue-dark to-navy',
    emoji: '🌐',
    title: 'Access Global Opportunities. Level Up Your Career.',
    subtitle: 'Jobs + Career',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const isLast = current === slides.length - 1

  return (
    <div className="h-screen bg-navy flex flex-col overflow-hidden">
      {/* Slide strip — transforms to show current slide */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`min-w-full h-full bg-gradient-to-b ${slide.gradient} flex flex-col items-center justify-center px-8 text-center`}
            >
              <div className="text-8xl mb-8">{slide.emoji}</div>
              <p className="text-white/60 text-sm mb-2">{slide.subtitle}</p>
              <h1 className="text-white text-2xl font-bold leading-tight">{slide.title}</h1>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 py-4 bg-navy/80">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* CTAs */}
      <div className="px-6 pb-10 bg-navy space-y-3">
        {isLast ? (
          <>
            <button
              onClick={() => navigate('/sign-up')}
              className="w-full bg-blue text-white font-bold py-4 rounded-2xl"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/sign-in')}
              className="w-full bg-white/10 text-white font-semibold py-4 rounded-2xl"
            >
              I have an account
            </button>
          </>
        ) : (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="w-full bg-blue text-white font-bold py-4 rounded-2xl"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Write `SignIn.tsx`**

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    await signIn(data.email, data.password)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="bg-gradient-to-b from-navy to-blue px-6 pt-16 pb-10 text-center">
        <h1 className="text-white text-3xl font-bold">DEVCON<span className="text-gold">+</span></h1>
        <p className="text-white/60 mt-1 text-sm">Sign in to your account</p>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="juan@devcon.ph"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue text-white font-bold py-4 rounded-2xl disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/sign-up" className="text-blue font-semibold">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 3: Write `SignUp.tsx`**

Includes organizer code collapsible section (shows `ComingSoonModal` when code is entered — organizer code validation is out of scope for this migration).

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

const schema = z.object({
  full_name:         z.string().min(2, 'Name required'),
  email:             z.string().email('Invalid email'),
  password:          z.string().min(6, 'At least 6 characters'),
  school_or_company: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function SignUp() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const [showOrgCode, setShowOrgCode] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    await signIn(data.email, data.password)  // mock: signs in immediately
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="bg-gradient-to-b from-navy to-blue px-6 pt-16 pb-10 text-center">
        <h1 className="text-white text-3xl font-bold">DEVCON<span className="text-gold">+</span></h1>
        <p className="text-white/60 mt-1 text-sm">Create your account</p>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
            <input
              {...register('full_name')}
              placeholder="Juan dela Cruz"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.full_name && <p className="text-red text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="juan@devcon.ph"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              School / Company <span className="text-slate-400">(optional)</span>
            </label>
            <input
              {...register('school_or_company')}
              placeholder="University of Santo Tomas"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
          </div>

          {/* Organizer code toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowOrgCode((v) => !v)}
              className="text-sm text-blue font-semibold"
            >
              {showOrgCode ? '▼ Hide organizer code' : '▶ I have an organizer code'}
            </button>
            {showOrgCode && (
              <div className="mt-2 bg-blue/5 border border-blue/20 rounded-xl px-4 py-3 text-sm text-slate-500">
                Organizer code validation launches soon. For now, use the Organizer PWA at its own URL.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue text-white font-bold py-4 rounded-2xl disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-blue font-semibold">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Verify in dev server**

```bash
npm run dev
```

Navigate to `http://localhost:5173/onboarding` — 4-slide carousel with Next/Get Started CTAs. Tap "Get Started" → navigates to `/sign-up`. Sign up form → submits → navigates to `/` (Dashboard stub).

**Step 5: Commit**

```bash
git add apps/member/src/pages/auth/
git commit -m "feat(member): port auth pages — Onboarding, SignIn, SignUp"
```

---

### Task 8: Port Dashboard page

**Files:**
- Replace: `apps/member/src/pages/dashboard/Dashboard.tsx`

The dashboard has 6 strict sections from CLAUDE.md §8: rotating hero, XP card, Events For You (3), Hot Jobs (3), DEVCON Updates, Tech Community Updates.

**Step 1: Write `Dashboard.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { useJobsStore } from '../../stores/useJobsStore'
import XPCard from '../../components/XPCard'
import EventCard from '../../components/EventCard'
import JobCard from '../../components/JobCard'
import NewsCard from '../../components/NewsCard'
import { NEWS_POSTS } from '@devcon-plus/supabase'

const BANNERS = [
  { tag: '#SHEISDEVCON',       sub: 'Empowering women in tech' },
  { tag: 'KIDS HOUR OF AI',    sub: 'Introducing AI to the next gen' },
  { tag: '16 YEARS ANNIV',     sub: 'Celebrating 16 years of DEVCON' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { events } = useEventsStore()
  const { jobs } = useJobsStore()
  const [bannerIdx, setBannerIdx] = useState(0)

  // Rotate hero banner every 4 seconds
  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const banner = BANNERS[bannerIdx]
  const forYouEvents = events.filter((e) => e.status === 'upcoming').slice(0, 3)
  const hotJobs = jobs.slice(0, 3)
  const devconNews = NEWS_POSTS.filter((p) => p.category === 'devcon')
  const techNews   = NEWS_POSTS.filter((p) => p.category === 'tech_community')

  return (
    <div>
      {/* 1. Dynamic hero header */}
      <div className="bg-navy px-4 pt-14 pb-5">
        <p className="text-white/60 text-xs">Welcome back,</p>
        <h1 className="text-white text-xl font-bold">{user?.full_name ?? 'Member'}</h1>
        <div
          className="mt-3 bg-white/10 rounded-xl px-3 py-2 cursor-pointer"
          onClick={() => setBannerIdx((i) => (i + 1) % BANNERS.length)}
        >
          <p className="text-white/50 text-[10px] uppercase tracking-widest">{banner.sub}</p>
          <p className="text-gold text-sm font-extrabold tracking-wide">{banner.tag}</p>
          <div className="flex gap-1 mt-2">
            {BANNERS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === bannerIdx ? 'w-4 bg-gold' : 'w-1 bg-white/30'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. XP Card */}
      <div className="bg-navy pb-5">
        <XPCard />
      </div>

      {/* Sections */}
      <div className="bg-slate-50 space-y-6 pb-8">
        {/* 3. Events For You */}
        <section className="pt-6">
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Events For You</h2>
            <button onClick={() => navigate('/events')} className="text-xs text-blue font-semibold">
              See All
            </button>
          </div>
          <div className="px-4 space-y-3">
            {forYouEvents.map((e) => <EventCard key={e.id} event={e} compact />)}
          </div>
        </section>

        {/* 4. Hot Jobs */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Hot Jobs</h2>
            <button onClick={() => navigate('/jobs')} className="text-xs text-blue font-semibold">
              See All
            </button>
          </div>
          <div className="px-4 space-y-3">
            {hotJobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>

        {/* 5. DEVCON Updates */}
        <section>
          <h2 className="text-base font-bold text-slate-900 px-4 mb-3">DEVCON Updates</h2>
          <div className="px-4 space-y-3">
            {devconNews.map((p) => <NewsCard key={p.id} post={p} />)}
          </div>
        </section>

        {/* 6. Tech Community Updates */}
        <section>
          <h2 className="text-base font-bold text-slate-900 px-4 mb-3">Tech Community Updates</h2>
          <div className="px-4 space-y-3">
            {techNews.map((p) => <NewsCard key={p.id} post={p} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
```

**Step 2: Verify in dev server**

Navigate to `http://localhost:5173/`. Expected: navy header, hero banner cycles every 4s, XP card, event cards, job cards, news cards.

**Step 3: Commit**

```bash
git add apps/member/src/pages/dashboard/
git commit -m "feat(member): port Dashboard — rotating hero, XP card, 4 feed sections"
```

---

### Task 9: Port Events pages

**Files:**
- Replace: `apps/member/src/pages/events/EventsList.tsx`
- Replace: `apps/member/src/pages/events/EventDetail.tsx`
- Replace: `apps/member/src/pages/events/EventRegister.tsx`
- Replace: `apps/member/src/pages/events/EventPending.tsx`
- Replace: `apps/member/src/pages/events/EventTicket.tsx`

**Step 1: Write `EventsList.tsx`**

```tsx
import { useState } from 'react'
import { useEventsStore } from '../../stores/useEventsStore'
import EventCard from '../../components/EventCard'
import ChipBar from '../../components/ChipBar'

const CHAPTERS = ['All', 'Manila', 'Cebu', 'Davao', 'Laguna', 'Iloilo', 'Pampanga', 'Bulacan', 'Bacolod', 'CDO', 'GenSan', 'Zamboanga']

export default function EventsList() {
  const { events } = useEventsStore()
  const [tab, setTab] = useState<'for-you' | 'all'>('for-you')
  const [chapter, setChapter] = useState('All')

  const filtered = events.filter((e) => {
    if (tab === 'for-you') return e.status === 'upcoming'
    return true
  })

  return (
    <div>
      {/* Header + tab toggle */}
      <div className="bg-navy px-4 pt-14 pb-4">
        <h1 className="text-white text-xl font-bold">Events</h1>
        <div className="flex gap-2 mt-3">
          {(['for-you', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-blue text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {t === 'for-you' ? 'For You' : 'All Events'}
            </button>
          ))}
        </div>
      </div>

      {/* Chapter filter */}
      <div className="bg-navy pb-3">
        <ChipBar options={CHAPTERS} selected={chapter} onChange={setChapter} />
      </div>

      {/* List */}
      <div className="bg-slate-50 min-h-screen p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No events found</div>
        ) : (
          filtered.map((e) => <EventCard key={e.id} event={e} />)
        )}
      </div>
    </div>
  )
}
```

**Step 2: Write `EventDetail.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useEventsStore } from '../../stores/useEventsStore'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, registrations } = useEventsStore()
  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id)

  if (!event) return <div className="p-4 text-center text-slate-400 pt-20">Event not found</div>

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBA'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cover image */}
      {event.cover_image_url ? (
        <img src={event.cover_image_url} alt={event.title} className="w-full h-52 object-cover" />
      ) : (
        <div className="w-full h-52 bg-gradient-to-br from-blue to-navy flex items-center justify-center">
          <span className="text-white/20 text-7xl">🎪</span>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-14 left-4 bg-white/80 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center shadow-card text-slate-700"
      >
        ←
      </button>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">{dateStr}</p>
          <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
          {event.location && <p className="text-sm text-slate-500 mt-1">📍 {event.location}</p>}
        </div>

        <div className="flex gap-3">
          <div className="bg-blue/10 rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-blue text-xs font-medium">Points Value</p>
            <p className="text-blue font-bold">+{event.points_value} pts</p>
          </div>
          <div className="bg-slate-100 rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-slate-500 text-xs font-medium">Status</p>
            <p className="text-slate-700 font-bold capitalize">{event.status}</p>
          </div>
        </div>

        {event.description && (
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">About</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* CTA based on registration state */}
        <div className="pt-2">
          {!reg ? (
            <button
              onClick={() => navigate(`/events/${id}/register`)}
              className="w-full bg-blue text-white font-bold py-4 rounded-2xl"
            >
              Request to Join
            </button>
          ) : reg.status === 'pending' ? (
            <button
              onClick={() => navigate(`/events/${id}/pending`)}
              className="w-full bg-yellow-400 text-white font-bold py-4 rounded-2xl"
            >
              View Pending Status
            </button>
          ) : reg.status === 'approved' ? (
            <button
              onClick={() => navigate(`/events/${id}/ticket`)}
              className="w-full bg-green text-white font-bold py-4 rounded-2xl"
            >
              View My Ticket 🎟️
            </button>
          ) : (
            <div className="w-full bg-red/10 text-red font-semibold py-4 rounded-2xl text-center">
              Registration Rejected
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Write `EventRegister.tsx`**

Form is pre-filled from the mock profile. `useAuthStore` exposes `user` (not `profile`).

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'

export default function EventRegister() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, register } = useEventsStore()
  const { user } = useAuthStore()
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const event = events.find((e) => e.id === id)
  if (!event || !user || !id) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    setSubmitting(true)
    register(id)
    setTimeout(() => {
      navigate(event.requires_approval ? `/events/${id}/pending` : `/events/${id}/ticket`, { replace: true })
    }, 500)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-navy px-4 pt-14 pb-6">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        <h1 className="text-white text-xl font-bold">Register</h1>
        <p className="text-white/60 text-sm mt-1">{event.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Your Details (pre-filled)</p>

        {[
          { label: 'Full Name',         value: user.full_name },
          { label: 'Email',             value: user.email },
          { label: 'School / Company',  value: user.school_or_company ?? '' },
        ].map(({ label, value }) => (
          <div key={label}>
            <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
            <input
              value={value}
              readOnly
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-100 text-slate-500"
            />
          </div>
        ))}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-blue"
          />
          <span className="text-sm text-slate-600">
            I agree to the Terms & Conditions and Privacy Policy for this event.
          </span>
        </label>

        <button
          type="submit"
          disabled={!agreed || submitting}
          className="w-full bg-blue text-white font-bold py-4 rounded-2xl disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : 'Confirm Registration'}
        </button>
      </form>
    </div>
  )
}
```

**Step 4: Write `EventPending.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useEventsStore } from '../../stores/useEventsStore'

export default function EventPending() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events } = useEventsStore()
  const event = events.find((e) => e.id === id)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">⏳</div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">Awaiting Approval</h1>
      <p className="text-sm text-slate-500 mb-6">
        Your registration for <strong>{event?.title}</strong> is pending review by the chapter officer.
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 w-full max-w-xs mb-8">
        <p className="text-xs text-yellow-700 font-semibold">Status: Pending Approval</p>
      </div>
      <button
        onClick={() => navigate('/events')}
        className="w-full max-w-xs bg-blue text-white font-bold py-4 rounded-2xl"
      >
        Back to Events
      </button>
    </div>
  )
}
```

**Step 5: Write `EventTicket.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'

export default function EventTicket() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, registrations } = useEventsStore()
  const { user } = useAuthStore()
  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id)

  if (!event || !reg || reg.status !== 'approved') {
    return (
      <div className="p-4 text-center text-slate-400 pt-20">
        Ticket not available.{' '}
        <button onClick={() => navigate(-1)} className="text-blue">Go back</button>
      </div>
    )
  }

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBA'

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center px-6 py-10">
      <button onClick={() => navigate(-1)} className="self-start text-white/60 text-sm mb-6">← Back</button>

      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-blue">
        {/* Ticket header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-blue rounded-full mx-auto flex items-center justify-center mb-2">
            <span className="text-white font-bold">D+</span>
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Event Ticket</p>
          <h2 className="text-base font-bold text-slate-900 mt-1">{event.title}</h2>
          <p className="text-xs text-slate-500 mt-1">{dateStr}</p>
          {event.location && <p className="text-xs text-slate-400">📍 {event.location}</p>}
        </div>

        {/* QR code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <QRCodeSVG
              value={reg.qr_code_token ?? 'DEVCON-TICKET'}
              size={180}
              level="H"
              fgColor="#1E2A56"
            />
          </div>
        </div>

        {/* Member info */}
        <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Name</span>
            <span className="text-slate-900 font-medium">{user?.full_name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Ticket ID</span>
            <span className="text-slate-900 font-mono truncate max-w-[150px]">{reg.qr_code_token}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Points Value</span>
            <span className="text-green font-bold">+{event.points_value} pts</span>
          </div>
        </div>
      </div>

      <p className="text-white/40 text-xs text-center mt-6">
        Show this QR code at the venue entrance
      </p>
    </div>
  )
}
```

**Step 6: Verify full events flow in dev server**

Navigate: `/events` → click event card → `/events/:id` → "Request to Join" → form pre-filled → submit → `/events/:id/ticket` with QR code rendered.

**Step 7: Commit**

```bash
git add apps/member/src/pages/events/
git commit -m "feat(member): port Events pages (list, detail, register, pending, ticket)"
```

---

### Task 10: Port Jobs pages

**Files:**
- Replace: `apps/member/src/pages/jobs/JobsList.tsx`
- Replace: `apps/member/src/pages/jobs/JobDetail.tsx`

**Step 1: Write `JobsList.tsx`**

```tsx
import { useState } from 'react'
import { useJobsStore } from '../../stores/useJobsStore'
import JobCard from '../../components/JobCard'

const FILTERS = ['All', 'Remote', 'Onsite', 'Hybrid']

export default function JobsList() {
  const { jobs } = useJobsStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = jobs.filter((j) => {
    const matchSearch =
      search === '' ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All' || j.work_type.toLowerCase() === filter.toLowerCase()
    return matchSearch && matchFilter
  })

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-4">
        <h1 className="text-white text-xl font-bold mb-3">Jobs Board</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs or companies…"
          className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-2.5 text-sm border border-white/20 focus:outline-none"
        />
        <div className="flex gap-2 mt-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                filter === f ? 'bg-blue text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No jobs found</div>
        ) : (
          filtered.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </div>
    </div>
  )
}
```

**Step 2: Write `JobDetail.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useJobsStore } from '../../stores/useJobsStore'
import PromotedBadge from '../../components/PromotedBadge'

const workTypeLabel: Record<string, string> = {
  remote:    '🌐 Remote',
  onsite:    '🏢 Onsite',
  hybrid:    '🔀 Hybrid',
  full_time: 'Full-time',
  part_time: 'Part-time',
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { jobs, savedIds, toggleSave } = useJobsStore()
  const job = jobs.find((j) => j.id === id)

  if (!job) return <div className="p-4 text-center text-slate-400 pt-20">Job not found</div>

  const isSaved = savedIds.includes(job.id)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-navy px-4 pt-14 pb-6 relative">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        {job.is_promoted && <div className="absolute top-14 right-4"><PromotedBadge /></div>}
        <p className="text-white/60 text-xs">{job.company}</p>
        <h1 className="text-white text-xl font-bold">{job.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="bg-white/10 text-white/80 text-xs px-2 py-0.5 rounded-full">
            {workTypeLabel[job.work_type] ?? job.work_type}
          </span>
          {job.location && <span className="text-white/60 text-xs">📍 {job.location}</span>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {job.description && (
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">About the Role</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => toggleSave(job.id)}
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm border transition-colors ${
              isSaved ? 'border-blue bg-blue/10 text-blue' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {isSaved ? '✓ Saved' : 'Save'}
          </button>
          <a
            href={job.apply_url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-blue text-white text-center"
          >
            Apply Now
          </a>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/member/src/pages/jobs/
git commit -m "feat(member): port Jobs pages (list with search/filter, detail with save/apply)"
```

---

### Task 11: Port Points pages

**Files:**
- Replace: `apps/member/src/pages/points/Points.tsx`
- Replace: `apps/member/src/pages/points/PointsHistory.tsx`

**Step 1: Write `Points.tsx`**

Two tabs: Ways to Earn and Share & Earn.

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePointsStore } from '../../stores/usePointsStore'

const EARN = [
  { icon: '🎫', label: 'Attend an Event',      pts: '100–300 pts' },
  { icon: '🎤', label: 'Speak at an Event',    pts: '700 pts'     },
  { icon: '🙋', label: 'Volunteer',            pts: '100–500 pts' },
  { icon: '☕', label: 'Brown Bag Session',    pts: '250 pts'     },
]

const SHARE = [
  { icon: '❤️', label: 'Like Content',                 pts: '5 pts'    },
  { icon: '🔗', label: 'Share + Submit Link',          pts: '10–25 pts' },
]

export default function Points() {
  const navigate = useNavigate()
  const { totalPoints } = usePointsStore()
  const [tab, setTab] = useState<'earn' | 'share'>('earn')
  const items = tab === 'earn' ? EARN : SHARE

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-6">
        <h1 className="text-white text-xl font-bold">Points+</h1>
        <p className="text-white/60 text-sm mt-1">
          You have <strong className="text-gold">{totalPoints.toLocaleString()} pts</strong>
        </p>
        <div className="flex gap-2 mt-4">
          {(['earn', 'share'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-blue text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {t === 'earn' ? 'Ways to Earn' : 'Share & Earn'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-3">
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
                <span className="text-xs font-bold text-blue">{item.pts}</span>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => navigate('/points/history')}
          className="w-full mt-2 bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl text-sm shadow-card"
        >
          View Points History
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Write `PointsHistory.tsx`**

Groups transactions by date, sorted newest-first. Ends with "That's it!" (nmblr+ pattern from CLAUDE.md §7).

```tsx
import { useNavigate } from 'react-router-dom'
import { usePointsStore } from '../../stores/usePointsStore'
import TransactionRow from '../../components/TransactionRow'
import type { PointTransaction } from '@devcon-plus/supabase'

function groupByDate(txs: PointTransaction[]): Array<[string, PointTransaction[]]> {
  const groups: Record<string, PointTransaction[]> = {}
  for (const tx of txs) {
    const day = new Date(tx.created_at ?? '').toLocaleDateString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    if (!groups[day]) groups[day] = []
    groups[day].push(tx)
  }
  return Object.entries(groups)
}

export default function PointsHistory() {
  const navigate = useNavigate()
  const { transactions, totalPoints } = usePointsStore()

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
  )
  const groups = groupByDate(sorted)

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-6">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        <h1 className="text-white text-xl font-bold">Points History</h1>
        <p className="text-gold font-bold text-2xl mt-1">{totalPoints.toLocaleString()} pts</p>
      </div>

      <div className="bg-slate-50 min-h-screen p-4">
        {groups.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No transactions yet</div>
        ) : (
          groups.map(([date, txs]) => (
            <div key={date} className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{date}</p>
              <div className="bg-white rounded-2xl shadow-card px-4">
                {txs.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
              </div>
            </div>
          ))
        )}
        {groups.length > 0 && (
          <p className="text-center text-xs text-slate-400 mt-6 pb-4">That's it!</p>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/member/src/pages/points/
git commit -m "feat(member): port Points pages (earn guide, history with date groups)"
```

---

### Task 12: Port Rewards page

**Files:**
- Replace: `apps/member/src/pages/rewards/Rewards.tsx`

All rewards tap to `ComingSoonModal` (MVP — `is_coming_soon = true` for all per CLAUDE.md §11).

**Step 1: Write `Rewards.tsx`**

```tsx
import { useState } from 'react'
import { REWARDS } from '@devcon-plus/supabase'
import { usePointsStore } from '../../stores/usePointsStore'
import ComingSoonModal from '../../components/ComingSoonModal'

const REWARD_ICONS: Record<string, string> = {
  'Lanyard':       '🏷️',
  'Coffee Voucher':'☕',
  'DEVCON Cap':    '🧢',
  'Keyboard':      '⌨️',
  'Headset':       '🎧',
  'DEVCON Shirt':  '👕',
  'DEVCON Mug':    '☕',
}

export default function Rewards() {
  const { totalPoints } = usePointsStore()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-6">
        <h1 className="text-white text-xl font-bold">Rewards</h1>
        <p className="text-white/60 text-sm mt-1">
          You have <strong className="text-gold">{totalPoints.toLocaleString()} pts</strong>
        </p>
      </div>

      <div className="bg-slate-50 min-h-screen p-4">
        <div className="grid grid-cols-2 gap-3">
          {REWARDS.map((reward) => (
            <button
              key={reward.id}
              onClick={() => setSelected(reward.name)}
              className="bg-white rounded-2xl shadow-card p-4 text-left"
            >
              <div className="w-full h-24 bg-gradient-to-br from-blue/10 to-navy/10 rounded-xl flex items-center justify-center mb-3">
                <span className="text-3xl">{REWARD_ICONS[reward.name] ?? '🎁'}</span>
              </div>
              <p className="font-semibold text-slate-900 text-sm leading-tight">{reward.name}</p>
              <p className="text-xs font-bold text-blue mt-1">{reward.points_cost.toLocaleString()} pts</p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <ComingSoonModal feature={`${selected} redemption`} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/member/src/pages/rewards/
git commit -m "feat(member): port Rewards page (grid + ComingSoonModal on tap)"
```

---

### Task 13: Port Profile pages

**Files:**
- Replace: `apps/member/src/pages/profile/Profile.tsx`
- Replace: `apps/member/src/pages/profile/ProfileEdit.tsx`
- Replace: `apps/member/src/pages/profile/Notifications.tsx`
- Replace: `apps/member/src/pages/profile/Privacy.tsx`

**Step 1: Write `Profile.tsx`**

Note: auth store uses `user`, not `profile`.

```tsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePointsStore } from '../../stores/usePointsStore'

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { totalPoints } = usePointsStore()

  const initials = user?.full_name
    ?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  const menu = [
    { label: 'Edit Profile',   icon: '✏️', path: '/profile/edit'           },
    { label: 'Notifications',  icon: '🔔', path: '/profile/notifications'  },
    { label: 'Privacy',        icon: '🔒', path: '/profile/privacy'        },
  ]

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-8 text-center">
        <div className="w-20 h-20 bg-blue rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        <h1 className="text-white text-xl font-bold">{user?.full_name}</h1>
        <p className="text-white/60 text-sm">{user?.email}</p>
        <div className="mt-4">
          <p className="text-gold font-bold text-xl">{totalPoints.toLocaleString()}</p>
          <p className="text-white/50 text-xs">Points</p>
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-2">
        {menu.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full bg-white rounded-2xl shadow-card px-4 py-4 flex items-center gap-3 text-left"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 font-medium text-slate-900 text-sm">{item.label}</span>
            <span className="text-slate-300">›</span>
          </button>
        ))}

        <button
          onClick={() => { signOut(); navigate('/sign-in') }}
          className="w-full bg-red/10 text-red font-semibold py-4 rounded-2xl mt-4"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Write `ProfileEdit.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../stores/useAuthStore'

const schema = z.object({
  full_name:         z.string().min(2, 'Name required'),
  school_or_company: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:         user?.full_name ?? '',
      school_or_company: user?.school_or_company ?? '',
    },
  })

  const onSubmit = (_data: FormData) => navigate('/profile')  // mock: no real save

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-navy px-4 pt-14 pb-6">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        <h1 className="text-white text-xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
          <input
            {...register('full_name')}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
          />
          {errors.full_name && <p className="text-red text-xs mt-1">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">School / Company</label>
          <input
            {...register('school_or_company')}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
          />
        </div>

        <button type="submit" className="w-full bg-blue text-white font-bold py-4 rounded-2xl">
          Save Changes
        </button>
      </form>
    </div>
  )
}
```

**Step 3: Write `Notifications.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SETTINGS = [
  { key: 'event_updates', label: 'Event Updates',  desc: 'Registration confirmations and reminders' },
  { key: 'points_earned', label: 'Points Earned',  desc: 'When you earn or redeem points'           },
  { key: 'new_events',    label: 'New Events',     desc: 'Events from your chapter'                 },
  { key: 'job_alerts',    label: 'Job Alerts',     desc: 'New jobs on the board'                    },
]

export default function Notifications() {
  const navigate = useNavigate()
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(SETTINGS.map((s) => [s.key, true]))
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-navy px-4 pt-14 pb-6">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        <h1 className="text-white text-xl font-bold">Notifications</h1>
      </div>

      <div className="p-4 space-y-2">
        {SETTINGS.map((s) => (
          <div key={s.key} className="bg-white rounded-2xl shadow-card px-4 py-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-slate-900 text-sm">{s.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
            </div>
            <button
              onClick={() => setOn((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
              className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on[s.key] ? 'bg-blue' : 'bg-slate-200'}`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${on[s.key] ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Write `Privacy.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ComingSoonModal from '../../components/ComingSoonModal'

const OPTIONS = ['Profile Visibility', 'Data Export', 'Delete Account']

export default function Privacy() {
  const navigate = useNavigate()
  const [modal, setModal] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-navy px-4 pt-14 pb-6">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        <h1 className="text-white text-xl font-bold">Privacy</h1>
      </div>

      <div className="p-4 space-y-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setModal(opt)}
            className="w-full bg-white rounded-2xl shadow-card px-4 py-4 flex items-center text-left"
          >
            <span className="flex-1 font-medium text-slate-900 text-sm">{opt}</span>
            <span className="text-slate-300">›</span>
          </button>
        ))}
      </div>

      {modal && <ComingSoonModal feature={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add apps/member/src/pages/profile/
git commit -m "feat(member): port Profile pages (profile, edit, notifications, privacy)"
```

---

### Task 14: Update vercel.json, final cleanup, verify build

**Files:**
- Modify: `apps/member/vercel.json`

**Step 1: Update `apps/member/vercel.json`**

Change the build command from `npx expo export --platform web` to `npm run build`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 2: Clean up any remaining Expo artifacts**

```bash
rm -rf apps/member/stores apps/member/constants apps/member/hooks
```

(These should already be gone, but clean up anything lingering.)

**Step 3: Run full TypeScript check**

```bash
cd apps/member && npm run typecheck
```

Expected: Exit code 0. No errors.

**Step 4: Run production build**

```bash
npm run build
```

Expected:
```
vite v7.x.x building for production...
✓ NNN modules transformed.
dist/index.html     X.XX kB
dist/assets/index-[hash].js   XXX.XX kB
✓ built in X.XXs
```

If TypeScript errors appear, fix before proceeding. Common issues:
- `user` vs `profile` mismatch — use `user` everywhere (check `useAuthStore`)
- Missing `type` keyword on imported interfaces — add `import type { ... }`
- Unused variable — prefix with `_` or remove

**Step 5: Test in preview mode**

```bash
npm run preview
```

Open `http://localhost:4173`. Verify checklist:
- [ ] `/` — Dashboard: rotating banner + XP card + event/job/news feeds
- [ ] `/events` — list with tab toggle + chapter chip filter
- [ ] `/events/:id` — detail with "Request to Join" button
- [ ] Registration flow: fills pre-populated form → submits → ticket with QR code
- [ ] `/jobs` — search bar + filter chips + card list
- [ ] `/jobs/:id` — detail + Save toggle + Apply Now
- [ ] `/points` — balance + earn methods, link to history
- [ ] `/points/history` — grouped by date, "That's it!" footer
- [ ] `/rewards` — 2-col grid + ComingSoonModal on tap
- [ ] `/profile` → edit, notifications, privacy sub-pages
- [ ] Sign out → navigates to `/sign-in`
- [ ] `/onboarding` → 4 slides → navigates to `/sign-up`
- [ ] Browser Dev Tools → Application → Manifest → shows DEVCON+ PWA manifest

**Step 6: Final commit**

```bash
git add apps/member/vercel.json
git commit -m "feat(member): update vercel.json for Vite build — migration complete"
```

---

## Done

All 14 tasks complete. The member app is now a Vite PWA. Teammates can run from the monorepo root:

```bash
npm install   # no --legacy-peer-deps needed
npm run dev:member   # starts at localhost:5173 (or next port)
```
