# 404 Not Found Screen — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `NotFound` component that handles unknown URLs (via a router catch-all) and missing content on the three member detail pages (EventDetail, NewsDetail, JobDetail).

**Architecture:** One new `NotFound.tsx` page component, zero layout wrappers. The router gets a single `path: '*'` catch-all at the end of the route array. The three detail pages swap their minimal unstyled not-found states for `<NotFound />`, guarded by loading state where a fetch is in flight to prevent flashing.

**Tech Stack:** React 19, React Router DOM v7 (`createBrowserRouter`), Tailwind CSS v3, lucide-react, Zustand v5, TypeScript strict

---

## File Map

| File | Action |
|------|--------|
| `apps/member/src/pages/NotFound.tsx` | Create — new shared component |
| `apps/member/src/router.tsx` | Modify — add catch-all route + import |
| `apps/member/src/pages/events/EventDetail.tsx` | Modify — replace 1-line not-found div |
| `apps/member/src/pages/news/NewsDetail.tsx` | Modify — replace not-found block, add `isLoading` guard |
| `apps/member/src/pages/jobs/JobDetail.tsx` | Modify — replace Coming Soon placeholder with functional page + not-found state |

---

## Task 1: Create the `NotFound` component

**Files:**
- Create: `apps/member/src/pages/NotFound.tsx`

Context: This component is used in two contexts — as a full-page standalone (catch-all route, no nav bar) and inline inside MemberLayout detail pages (nav bar provided by parent). `min-h-screen` covers both: standalone fills the viewport, inline fills whatever space the layout gives it.

- [ ] **Step 1: Create `NotFound.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import logoMark from '../assets/logos/logo-mark.svg'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="py-24 px-8 flex flex-col items-center justify-center text-center bg-slate-50 min-h-screen">
      <img src={logoMark} alt="DEVCON+" className="h-8 w-auto mb-8 opacity-30" />

      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <SearchX className="w-8 h-8 text-primary" />
      </div>

      <p className="text-8xl font-black text-primary leading-none">404</p>
      <h1 className="text-xl font-bold text-slate-900 mt-4">Nothing here.</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-xs">
        This page doesn't exist or may have been removed.
      </p>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => navigate('/home')}
          className="bg-primary text-white font-semibold text-sm px-6 py-3 rounded-full"
        >
          Go Home
        </button>
        <button
          onClick={() => navigate(-1)}
          className="border border-slate-200 text-slate-700 font-semibold text-sm px-6 py-3 rounded-full"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/NotFound.tsx
git commit -m "feat(NotFound): add shared 404 component"
```

---

## Task 2: Add catch-all route to router

**Files:**
- Modify: `apps/member/src/router.tsx`

Context: The catch-all `path: '*'` must be the **last** entry in the `createBrowserRouter` array — after the OrganizerLayout group. If placed inside a layout group, it would inherit that layout's nav bar. Standalone is correct here: unknown URLs should get a clean full-page 404 with no nav.

- [ ] **Step 1: Add the `NotFound` import**

In `apps/member/src/router.tsx`, find the auth page imports block (lines 7–14):

```ts
// Auth pages (no tab nav)
import SplashScreen from './pages/auth/SplashScreen'
import Onboarding from './pages/auth/Onboarding'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import OrganizerCodeGate from './pages/auth/OrganizerCodeGate'
import ForgotPassword from './pages/auth/ForgotPassword'
import EmailSent from './pages/auth/EmailSent'
import ResetPassword from './pages/auth/ResetPassword'
```

Add `NotFound` as the last import in that block:

```ts
// Auth pages (no tab nav)
import SplashScreen from './pages/auth/SplashScreen'
import Onboarding from './pages/auth/Onboarding'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import OrganizerCodeGate from './pages/auth/OrganizerCodeGate'
import ForgotPassword from './pages/auth/ForgotPassword'
import EmailSent from './pages/auth/EmailSent'
import ResetPassword from './pages/auth/ResetPassword'
import NotFound from './pages/NotFound'
```

- [ ] **Step 2: Add the catch-all route**

Find the closing of the OrganizerLayout group in `apps/member/src/router.tsx` (the `}` that closes the last layout group, before the final `])`):

```ts
      { path: '/organizer/profile/privacy',              element: <Privacy /> },
    ],
  },
])
```

Replace with:

```ts
      { path: '/organizer/profile/privacy',              element: <Privacy /> },
    ],
  },

  // Catch-all — must be last, outside all layout groups
  { path: '*', element: <NotFound /> },
])
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/router.tsx
git commit -m "feat(router): add catch-all 404 route"
```

---

## Task 3: Update EventDetail — replace minimal not-found div

**Files:**
- Modify: `apps/member/src/pages/events/EventDetail.tsx`

Context: EventDetail reads directly from the `useEventsStore` array without initiating its own fetch (it relies on the store being populated by EventsList or Dashboard navigation). The current not-found guard on line 13 runs synchronously on every render. Since there is no in-flight fetch initiated by this component, a loading guard is not needed — just replace the div.

- [ ] **Step 1: Add the `NotFound` import**

In `apps/member/src/pages/events/EventDetail.tsx`, find the import block (lines 1–4):

```ts
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Ticket } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEventsStore } from '../../stores/useEventsStore'
```

Add `NotFound` import:

```ts
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Ticket } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEventsStore } from '../../stores/useEventsStore'
import NotFound from '../NotFound'
```

- [ ] **Step 2: Replace the not-found guard**

Find line 13:

```tsx
  if (!event) return <div className="p-4 text-center text-slate-400 pt-20">Event not found</div>
```

Replace with:

```tsx
  if (!event) return <NotFound />
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/events/EventDetail.tsx
git commit -m "fix(EventDetail): show NotFound instead of unstyled div when event is missing"
```

---

## Task 4: Update NewsDetail — add loading guard + replace not-found block

**Files:**
- Modify: `apps/member/src/pages/news/NewsDetail.tsx`

Context: `NewsDetail` calls `fetchNews()` in `useEffect` when `posts` is empty, setting `isLoading = true` during the fetch. On the first render, `posts` is `[]` and `post` is `undefined`, so the current not-found block fires before the fetch resolves — a flash. The fix adds an `isLoading` check: while loading, return `null` (nothing visible yet). After loading, if the post is still missing, render `<NotFound />`.

- [ ] **Step 1: Add the `NotFound` import**

In `apps/member/src/pages/news/NewsDetail.tsx`, find the import block (lines 1–9):

```ts
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Tag, Newspaper } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNewsStore } from '../../stores/useNewsStore'
import PromotedBadge from '../../components/PromotedBadge'
import { fadeUp } from '../../lib/animation'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/dates'
```

Add `NotFound` import:

```ts
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Tag, Newspaper } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNewsStore } from '../../stores/useNewsStore'
import PromotedBadge from '../../components/PromotedBadge'
import { fadeUp } from '../../lib/animation'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/dates'
import NotFound from '../NotFound'
```

- [ ] **Step 2: Destructure `isLoading` from the store**

Find line 101 inside `NewsDetail()`:

```ts
  const { posts, fetchNews } = useNewsStore()
```

Replace with:

```ts
  const { posts, fetchNews, isLoading } = useNewsStore()
```

- [ ] **Step 3: Replace the not-found block**

Find the entire not-found block (lines 109–122):

```tsx
  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <Newspaper className="w-12 h-12 text-slate-300 mb-4" />
        <p className="font-semibold text-slate-700">Article not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-primary text-sm font-semibold"
        >
          Go back
        </button>
      </div>
    )
  }
```

Replace with:

```tsx
  if (!post && isLoading) return null
  if (!post) return <NotFound />
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 5: Check `navigate` is still used**

After removing the not-found block, `navigate` is no longer used in `NewsDetail`. Remove it from the destructure on the `useNavigate` line:

Find:
```ts
  const navigate = useNavigate()
```

The `navigate` variable — check if it's used anywhere else in the file. It is NOT used elsewhere in NewsDetail (the back button in the article hero uses its own inline `navigate(-1)` via the same hook). Wait — actually the back button at line 147 in the article content also calls `navigate(-1)`. So `navigate` IS still used. No change needed here.

Verify by searching the file for `navigate` usages — there should be at least one remaining usage on the `<button onClick={() => navigate(-1)}` at the back button in the hero section.

- [ ] **Step 6: Commit**

```bash
git add apps/member/src/pages/news/NewsDetail.tsx
git commit -m "fix(NewsDetail): replace article-not-found block with NotFound component"
```

---

## Task 5: Replace `JobDetail` placeholder with functional page + not-found state

**Files:**
- Modify: `apps/member/src/pages/jobs/JobDetail.tsx`

Context: `JobDetail` is currently a "Coming Soon" placeholder with no job fetching — it renders a static screen for every `/jobs/:id` URL. This task replaces it with a real detail page that loads the job from `useJobsStore`, shows a spinner while loading, renders `<NotFound />` for unknown IDs, and shows the actual job data otherwise. `useJobsStore` already has `jobs`, `fetchJobs()`, and `isLoading` — no store changes needed.

- [ ] **Step 1: Replace `JobDetail.tsx` entirely**

Overwrite `apps/member/src/pages/jobs/JobDetail.tsx` with:

```tsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, MapPin, ExternalLink } from 'lucide-react'
import { useJobsStore } from '../../stores/useJobsStore'
import { WORK_TYPE_LABELS } from '../../lib/constants'
import NotFound from '../NotFound'

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { jobs, fetchJobs, isLoading } = useJobsStore()

  useEffect(() => {
    if (jobs.length === 0) void fetchJobs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const job = jobs.find((j) => j.id === id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) return <NotFound />

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary px-4 pt-14 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/80 text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white leading-tight">{job.title}</h1>
        <p className="text-white/70 text-sm mt-0.5">{job.company}</p>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full">
            {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
          </span>
          {job.location && (
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location}
            </span>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 mb-2">About This Role</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
          </div>
        )}

        {/* Apply CTA */}
        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            View Opportunity
          </a>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/jobs/JobDetail.tsx
git commit -m "feat(JobDetail): replace Coming Soon placeholder with real job page + NotFound state"
```

---

## Done

After all tasks, run a final typecheck:

```bash
npm run typecheck
```

Verify manually:
- Navigate to a non-existent URL (e.g. `/random-garbage`) → should see the styled 404 page with no nav bar
- Navigate to `/events/fake-id` → should see the styled 404 page inside the MemberLayout nav bar
- Navigate to `/news/fake-id` → same
- Navigate to `/jobs/fake-id` → same
- Click "Go Back" on the 404 page → navigates back
- Click "Go Home" → navigates to `/home`
