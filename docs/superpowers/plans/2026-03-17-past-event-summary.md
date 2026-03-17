# Past Event Summary Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Post-Event Summary page for organizers that shows a registration funnel and attendee list for lapsed events.

**Architecture:** Past events in `OrgEventsList` navigate to `/organizer/events/:id/summary` (new route) instead of the existing detail page. `OrgEventSummary` is a new page component that fetches the same registrant data as `OrgEventRegistrants` but renders it read-only using an updated `ApprovalCard` with a `readOnly` prop.

**Tech Stack:** React 19, React Router DOM v7, Zustand v5, Tailwind CSS v3, framer-motion, lucide-react, TypeScript strict, Supabase JS client.

**Verification:** No test infrastructure exists — each task is verified by `npm run typecheck` passing and manual smoke testing in the browser (`npm run dev:member`).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/supabase/src/mock/events.ts` | Modify | Fix `ev-1.status`; add `ev-past-1` fixture |
| `apps/member/src/components/ApprovalCard.tsx` | Modify | Add `readOnly` prop; make handlers optional |
| `apps/member/src/pages/organizer/events/EventSummary.tsx` | Create | Post-event summary page |
| `apps/member/src/router.tsx` | Modify | Register new route + eager import |
| `apps/member/src/pages/organizer/events/EventsList.tsx` | Modify | Conditional navigation + Archive badge |

---

## Task 1: Fix mock data

**Files:**
- Modify: `packages/supabase/src/mock/events.ts`

- [ ] **Step 1: Update `ev-1` status field**

In `packages/supabase/src/mock/events.ts`, find `id: 'ev-1'` and change:
```ts
status: 'upcoming',
```
to:
```ts
status: 'past',
```
This fixes the `StatusBadge` rendering on the already-archived DEVCON Summit card.

- [ ] **Step 2: Add `ev-past-1` fixture**

Append to the `EVENTS` array in `packages/supabase/src/mock/events.ts`:
```ts
{
  id: 'ev-past-1',
  chapter_id: 'ch-manila',
  title: 'DevTalk: Open Source in the Philippines',
  description: 'A community talk series celebrating Filipino open-source contributors.',
  location: 'DLSU Manila, Taft Avenue',
  event_date: '2026-03-01T09:00:00Z',
  end_date:   '2026-03-01T12:00:00Z',
  category: 'tech_talk',
  tags: ['Open Source', 'Community'],
  visibility: 'public',
  is_free: true,
  ticket_price_php: 0,
  capacity: 150,
  points_value: 100,
  requires_approval: false,
  status: 'past',
  is_featured: false,
  is_promoted: false,
  cover_image_url: null,
  created_by: 'organizer-1',
  created_at: '2026-02-10T00:00:00Z',
},
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/src/mock/events.ts
git commit -m "fix(mock): correct ev-1 status to past, add ev-past-1 fixture"
```

---

## Task 2: Add `readOnly` prop to `ApprovalCard`

**Files:**
- Modify: `apps/member/src/components/ApprovalCard.tsx`

`ApprovalCard` currently has `onApprove`, `onReject`, `onRevert` as required props. We need to make them optional and add `readOnly?: boolean`. When `readOnly` is true, suppress all action buttons.

- [ ] **Step 1: Update the interface**

In `apps/member/src/components/ApprovalCard.tsx`, replace the `ApprovalCardProps` interface (lines 16–22):

```ts
interface ApprovalCardProps {
  registration: Registration
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRevert?: (id: string) => void
  onCheckIn?: (id: string) => void
  readOnly?: boolean
}
```

- [ ] **Step 2: Update the function signature**

Replace the function signature (line 24):
```ts
export function ApprovalCard({ registration, onApprove, onReject, onRevert, onCheckIn, readOnly = false }: ApprovalCardProps) {
```

- [ ] **Step 3: Note on `whileTap`**

The spec mentions removing `whileTap` from the card root. The current `ApprovalCard` root element is a plain `<div>` (line 40) — it has no `whileTap` to remove. The only `whileTap` in the card is on the "Check In" `motion.button`, which is already hidden by the `!readOnly` guard in Step 4 below. **No separate change needed here.**

- [ ] **Step 4: Guard all action buttons with `!readOnly`**

Wrap each action section in a `!readOnly &&` guard. The three action sections are:

**Pending actions** (currently around line 59 — the `{registration.status === 'pending' && ...}` block):
```tsx
{!readOnly && registration.status === 'pending' && (
  <div className="flex gap-2">
    <button
      onClick={() => onReject?.(registration.id)}
      className="flex-1 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-red/5 hover:border-red hover:text-red transition-colors flex items-center justify-center gap-1.5"
    >
      <X className="w-3.5 h-3.5" />
      Reject
    </button>
    <button
      onClick={() => onApprove?.(registration.id)}
      className="flex-1 py-2 text-sm font-semibold rounded-xl bg-blue text-white hover:bg-blue-dark transition-colors flex items-center justify-center gap-1.5"
    >
      <Check className="w-3.5 h-3.5" />
      Approve
    </button>
  </div>
)}
```

**Check-in button** (currently around line 78 — `approved && !checked_in`):
```tsx
{!readOnly && registration.status === 'approved' && !registration.checked_in && (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => onCheckIn?.(registration.id)}
    className="w-full py-2 text-sm font-semibold rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors flex items-center justify-center gap-1.5"
  >
    <UserCheck className="w-3.5 h-3.5" />
    Check In
  </motion.button>
)}
```

**Checked-in badge** — keep this visible in read-only (it's informational, not an action). No change needed.

**Rejected revert** (currently around line 95 — `rejected` block):
```tsx
{registration.status === 'rejected' && (
  <div className="flex items-center justify-between gap-3">
    <p className="text-xs text-red font-semibold flex items-center gap-1">
      <XCircle className="w-3.5 h-3.5 shrink-0" />
      Registration rejected
    </p>
    {!readOnly && (
      <button
        onClick={() => onRevert?.(registration.id)}
        className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        Undo
      </button>
    )}
  </div>
)}
```

Note: also update the `onReject(registration.id)` and `onApprove(registration.id)` calls to use optional chaining (`onReject?.(...)`, `onApprove?.(...)`) since they are now optional.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```
Expected: no errors. `OrgEventRegistrants` (the existing caller) still passes all handlers so it is unaffected.

- [ ] **Step 6: Smoke test `OrgEventRegistrants`**

Start dev server (`npm run dev:member`), log in as organizer, open an upcoming event's registrants page. Verify approve/reject/check-in buttons still appear and work.

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/components/ApprovalCard.tsx
git commit -m "feat(ApprovalCard): add readOnly prop, make handlers optional"
```

---

## Task 3: Create `OrgEventSummary` page

**Files:**
- Create: `apps/member/src/pages/organizer/events/EventSummary.tsx`

This is a new page. Reference patterns from:
- `OrgEventDetail.tsx` — header + delete sheet pattern
- `OrgEventRegistrants.tsx` — Supabase fetch + filter tabs + ApprovalCard list pattern

- [ ] **Step 1: Create the file**

Create `apps/member/src/pages/organizer/events/EventSummary.tsx` with this full implementation:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, AlertTriangle, ClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useEventsStore } from '../../../stores/useEventsStore'
import { formatDate } from '../../../lib/dates'
import { ApprovalCard, type Registration } from '../../../components/ApprovalCard'
import { fadeUp, staggerContainer, cardItem } from '../../../lib/animation'

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export function OrgEventSummary() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, fetchEvents, deleteEvent } = useEventsStore()

  const [registrants, setRegistrants] = useState<Registration[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [filter, setFilter]           = useState<FilterStatus>('all')
  const [deleteStep, setDeleteStep]   = useState<0 | 1 | 2>(0)
  const [isDeleting, setIsDeleting]   = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Declared before useEffect so it is in scope inside the fetch closure.
  // (Same pattern as OrgEventRegistrants.tsx line 20.)
  const event = events.find((e) => e.id === id)

  // Guard: load events if store is empty
  useEffect(() => {
    if (events.length === 0) void fetchEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch registrants — re-runs if id or event title changes
  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    supabase
      .from('event_registrations')
      .select('id, status, registered_at, checked_in, profiles(full_name, email, school_or_company)')
      .eq('event_id', id)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        const mapped: Registration[] = (data ?? []).map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
          const p = profile as { full_name?: string; email?: string; school_or_company?: string } | null
          return {
            id:                row.id,
            member_name:       p?.full_name ?? 'Unknown',
            member_email:      p?.email ?? '',
            school_or_company: p?.school_or_company ?? '',
            event_title:       event?.title ?? '',
            registered_at:     row.registered_at ?? '',
            status:            row.status as Registration['status'],
            checked_in:        (row.checked_in as boolean | null) ?? false,
          }
        })
        setRegistrants(mapped)
        setIsLoading(false)
      })
  }, [id, event?.title]) // eslint-disable-line react-hooks/exhaustive-deps

  // Not-found fallback
  if (!event) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Event not found.</p>
      </div>
    )
  }

  // Funnel counts
  const funnel = {
    total:    registrants.length,
    checkedIn: registrants.filter((r) => r.checked_in).length,
    approved: registrants.filter((r) => r.status === 'approved').length,
    pending:  registrants.filter((r) => r.status === 'pending').length,
    rejected: registrants.filter((r) => r.status === 'rejected').length,
  }

  const counts: Record<FilterStatus, number> = {
    all:      registrants.length,
    approved: funnel.approved,
    pending:  funnel.pending,
    rejected: funnel.rejected,
  }

  const filtered = filter === 'all' ? registrants : registrants.filter((r) => r.status === filter)

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteEvent(event.id)
      navigate('/organizer/events', { replace: true })
    } catch {
      setDeleteError('Failed to delete event. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setDeleteStep(1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-red/40 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-white">{event.title}</h1>
        <p className="text-white/60 text-sm mt-0.5">
          Post-Event Summary
          {event.event_date ? ` • ${formatDate.full(event.event_date)}` : ''}
        </p>
      </div>

      <motion.div
        className="p-4 pb-24"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ── Funnel Stats ── */}
        <motion.div variants={fadeUp} className="mb-6 space-y-3">
          {/* Row 1: Total Registered + Checked In */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Registered', value: funnel.total,    color: 'text-blue' },
              { label: 'Checked In',       value: funnel.checkedIn, color: 'text-green' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
          {/* Row 2: Approved + Pending + Rejected */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Approved', value: funnel.approved, color: 'text-blue/70' },
              { label: 'Pending',  value: funnel.pending,  color: 'text-yellow-500' },
              { label: 'Rejected', value: funnel.rejected, color: 'text-red' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Filter tabs ── */}
        <motion.div variants={fadeUp} className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
          {(['all', 'approved', 'pending', 'rejected'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </motion.div>

        {/* ── Attendee list ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-32" />
                    <div className="h-3 bg-slate-100 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-base font-bold text-slate-700">No registrants found</p>
                <p className="text-sm text-slate-400 mt-1">
                  {filter === 'all' ? 'No one registered for this event.' : `No ${filter} registrations.`}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={filter}
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {filtered.map((reg) => (
                  <motion.div key={reg.id} variants={cardItem}>
                    <ApprovalCard registration={reg} readOnly />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Delete confirmation bottom sheets (2-step) ── */}
      <AnimatePresence>
        {deleteStep > 0 && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteStep(0)}
            />

            {deleteStep === 1 && (
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl px-5 pt-4 pb-10"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-red" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mb-1">Delete Event?</h2>
                  <p className="text-sm text-slate-500">
                    You are about to delete{' '}
                    <span className="font-semibold text-slate-700">"{event.title}"</span>.
                    This will also permanently remove all registrations for this event.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(0)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 py-3 rounded-xl bg-red/10 text-red text-sm font-bold"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {deleteStep === 2 && (
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl px-5 pt-4 pb-10"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-red" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mb-1">Are you Sure?</h2>
                  <p className="text-sm text-slate-500">
                    All registrations for this event will be permanently deleted along with the event itself.{' '}
                    <span className="font-semibold text-red">This cannot be undone.</span>
                  </p>
                  {deleteError && (
                    <p className="mt-3 text-sm text-red font-semibold">{deleteError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(0)}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl bg-red text-white text-sm font-bold disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete Everything'}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventSummary.tsx
git commit -m "feat(organizer): add OrgEventSummary post-event read-only page"
```

---

## Task 4: Register the route in `router.tsx`

**Files:**
- Modify: `apps/member/src/router.tsx`

- [ ] **Step 1: Add the import**

In `apps/member/src/router.tsx`, add after the `OrgEventRegistrants` import line (line 40):
```ts
import { OrgEventSummary } from './pages/organizer/events/EventSummary'
```

- [ ] **Step 2: Add the route**

In the organizer children array, after the `OrgEventRegistrants` route (line 129):
```ts
{ path: '/organizer/events/:id/registrants', element: <OrgEventRegistrants /> },
{ path: '/organizer/events/:id/summary',     element: <OrgEventSummary /> },   // ← add
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Smoke test — navigate directly to summary URL**

With dev server running, log in as organizer and navigate manually to `/organizer/events/ev-past-1/summary`. Verify the page renders with the header, empty funnel stats (all zeros — no live Supabase data), and the empty state for the registrant list.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/router.tsx
git commit -m "feat(router): register /organizer/events/:id/summary route"
```

---

## Task 5: Update `OrgEventsList` — conditional navigation + Archive badge

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventsList.tsx`

- [ ] **Step 1: Add the `Archive` icon import**

In `apps/member/src/pages/organizer/events/EventsList.tsx`, add `Archive` to the lucide import:
```ts
import { MapPin, Zap, Archive } from 'lucide-react'
```

- [ ] **Step 2: Update the card `onClick` to conditional navigation**

Find the `onClick` on the `motion.div` card (currently `onClick={() => navigate(\`/organizer/events/${event.id}\`)}`). Replace with:
```ts
onClick={() => navigate(
  isEventArchived(event)
    ? `/organizer/events/${event.id}/summary`
    : `/organizer/events/${event.id}`
)}
```

`isEventArchived` is already imported at the top of the file.

- [ ] **Step 3: Add Archive badge to past event cards**

Inside the card's `flex items-start gap-4` content area, add the Archive badge in the top-right. Find the `<div className="flex items-start justify-between gap-2">` (the row that contains the event title and StatusBadge). Add the Archive icon inline next to StatusBadge, but only for past events:

```tsx
<div className="flex items-start justify-between gap-2">
  <p className="text-base font-bold text-slate-900 truncate">{event.title}</p>
  <div className="flex items-center gap-1.5 shrink-0">
    {isEventArchived(event) && (
      <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
        <Archive className="w-3 h-3" />
        Past
      </span>
    )}
    <StatusBadge status={event.status === 'upcoming' ? 'pending' : event.status === 'ongoing' ? 'approved' : 'rejected'} />
  </div>
</div>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Smoke test full flow**

With dev server running (`npm run dev:member`), log in as organizer:

1. Go to `/organizer/events` — verify "Past" tab shows `ev-1` (DEVCON Summit) and `ev-past-1` (DevTalk) with the Archive badge.
2. Tap `ev-past-1` — verify it navigates to `/organizer/events/ev-past-1/summary`.
3. On the summary page, verify: header shows event title + "Post-Event Summary", funnel shows all zeros, filter tabs work, no action buttons in the registrant list.
4. Tap the Trash icon — verify 2-step confirm sheet appears and Cancel dismisses it.
5. Tap an upcoming event in the "Upcoming" tab — verify it still navigates to the regular `/organizer/events/:id` detail page with all actions intact.

- [ ] **Step 6: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventsList.tsx
git commit -m "feat(organizer): route past events to summary page, add Archive badge"
```

---

## Done

All tasks complete. The feature is fully wired:
- Past events in `OrgEventsList` → `/organizer/events/:id/summary` (read-only)
- Upcoming events → `/organizer/events/:id` (unchanged)
- `OrgEventSummary` shows funnel stats + read-only attendee list + delete sheet
- `ApprovalCard` `readOnly` prop hides all action buttons
