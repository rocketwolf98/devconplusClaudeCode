# Event Lifecycle Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event archiving by end date, member cancel registration with double confirmation, and organizer manual check-in with instant Realtime feedback on the member's ticket.

**Architecture:** Foundation-first — DB migration + shared type change unlock everything else. Three independent feature tracks (archiving, cancel, manual check-in) can then be implemented in any order. All Realtime plumbing for check-in is already in place; manual check-in just needs the RPC + UI to trigger it.

**Tech Stack:** React 19 + Vite, TypeScript strict, Tailwind CSS v3, Zustand v5, Supabase (Postgres RPC + Realtime), framer-motion, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-14-event-lifecycle-features-design.md`

---

## Chunk 1: Foundation — DB + Types + Utility

### Task 1: DB Migration — cancelled status + manual_checkin RPC

**Files:**
- Create: `supabase/migrations/20260314_event_lifecycle.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260314_event_lifecycle.sql

-- 1. Add 'cancelled' to event_registrations status CHECK
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- 2. manual_checkin RPC
CREATE OR REPLACE FUNCTION manual_checkin(
  p_registration_id uuid,
  p_organizer_id    uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg      event_registrations%ROWTYPE;
  v_event    events%ROWTYPE;
  v_profile  profiles%ROWTYPE;
  v_org_role text;
BEGIN
  -- Verify organizer role
  SELECT role INTO v_org_role FROM profiles WHERE id = p_organizer_id;
  IF v_org_role NOT IN ('chapter_officer', 'hq_admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Get and validate registration
  SELECT * INTO v_reg FROM event_registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'registration_not_found');
  END IF;
  IF v_reg.status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'not_approved');
  END IF;
  -- Idempotency guard
  IF v_reg.checked_in IS TRUE THEN
    RETURN json_build_object('success', false, 'error', 'already_checked_in');
  END IF;

  SELECT * INTO v_event   FROM events   WHERE id = v_reg.event_id;
  SELECT * INTO v_profile FROM profiles WHERE id = v_reg.user_id;

  -- Mark checked in
  UPDATE event_registrations SET checked_in = true WHERE id = p_registration_id;

  -- Award points
  INSERT INTO point_transactions (user_id, amount, description, source)
  VALUES (
    v_reg.user_id,
    v_event.points_value,
    'Attended: ' || v_event.title,
    'event_attendance'
  );

  UPDATE profiles
  SET total_points = total_points + v_event.points_value
  WHERE id = v_reg.user_id;

  RETURN json_build_object(
    'success',        true,
    'member_name',    v_profile.full_name,
    'points_awarded', v_event.points_value
  );
END;
$$;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Run via `mcp__supabase__apply_migration` with name `20260314_event_lifecycle` and the SQL above.

- [ ] **Step 3: Verify constraint via SQL**

```sql
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'event_registrations'::regclass
  AND contype = 'c';
```
Expected: row with `event_registrations_status_check` containing `cancelled`.

- [ ] **Step 4: Verify RPC exists**

```sql
SELECT proname FROM pg_proc WHERE proname = 'manual_checkin';
```
Expected: one row.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260314_event_lifecycle.sql
git commit -m "feat(db): add cancelled status + manual_checkin RPC"
```

---

### Task 2: Update RegistrationStatus type

**Files:**
- Modify: `packages/supabase/src/types.ts`

- [ ] **Step 1: Read the file to find RegistrationStatus**

Open `packages/supabase/src/types.ts` and find the line:
```ts
export type RegistrationStatus = 'pending' | 'approved' | 'rejected'
```

- [ ] **Step 2: Add 'cancelled' to the union**

```ts
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/src/types.ts
git commit -m "feat(types): add cancelled to RegistrationStatus"
```

---

### Task 3: isEventArchived utility

**Files:**
- Modify: `apps/member/src/lib/dates.ts`

- [ ] **Step 1: Prepend the import as line 1 of dates.ts**

`dates.ts` currently has no imports. Add this as the very first line of the file:
```ts
import type { Event } from '@devcon-plus/supabase'
```

- [ ] **Step 2: Append the helper at the bottom of dates.ts**

```ts
/** Returns true when the event's end time (or start time if no end) has passed. */
export function isEventArchived(event: Event, now = new Date()): boolean {
  const cutoff = event.end_date ?? event.event_date
  return cutoff ? new Date(cutoff) < now : false
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/lib/dates.ts
git commit -m "feat(dates): add isEventArchived utility"
```

---

## Chunk 2: Event Archiving — UI Filters

### Task 4: Member EventsList — filter Discover tab

**Files:**
- Modify: `apps/member/src/pages/events/EventsList.tsx`

- [ ] **Step 1: Import isEventArchived**

At the top of `EventsList.tsx`, add to existing lib imports:
```ts
import { isEventArchived } from '../../lib/dates'
```

- [ ] **Step 2: Filter filteredEvents in Discover tab**

Find the line:
```ts
const filteredEvents = selectedChapterId
  ? events.filter((e) => e.chapter_id === selectedChapterId)
  : events
```

Change to:
```ts
const activeEvents = events.filter((e) => !isEventArchived(e))

const filteredEvents = selectedChapterId
  ? activeEvents.filter((e) => e.chapter_id === selectedChapterId)
  : activeEvents
```

- [ ] **Step 3: Update the empty-state condition to use activeEvents**

Also find the Discover empty state (usually `events.length === 0` or `filteredEvents.length === 0`) and verify it checks `filteredEvents.length === 0` (which now derives from `activeEvents`). The condition already refers to `filteredEvents`, so no separate change is needed — but confirm it is not checking the raw `events` array.

- [ ] **Step 4: My Tickets — no change needed (allowlist already excludes cancelled)**

The `myTickets` filter is:
```ts
.filter((r) => r.status === 'approved' || r.status === 'pending')
```
This allowlist implicitly excludes `'cancelled'` rows. My Tickets still shows archived events' tickets (correct per spec). No change needed.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 6: Manual verify**

Run `npm run dev:member`. Open `/events`. Confirm events with `end_date` in the past are not shown in Discover. Switch to My Tickets — confirm past tickets still appear.

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/events/EventsList.tsx
git commit -m "feat(events): hide archived events from Discover tab"
```

---

### Task 5: Dashboard — filter Events For You

**Files:**
- Modify: `apps/member/src/pages/dashboard/Dashboard.tsx`

- [ ] **Step 1: Import isEventArchived**

```ts
import { isEventArchived } from '../../lib/dates'
```

- [ ] **Step 2: Find the forYouEvents computation and augment the filter**

Find the line(s) that compute the "Events For You" list. They currently look like:
```ts
const forYouEvents = events.filter((e) => e.status === 'upcoming').slice(0, 3)
```

Change to:
```ts
const forYouEvents = events
  .filter((e) => e.status === 'upcoming' && !isEventArchived(e))
  .slice(0, 3)
```

Also find the `upcomingByDate` variable (used by the rotating banner, around line 64–66):
```ts
// before
const upcomingByDate = events
  .filter((e) => e.status === 'upcoming')
  .sort(...)
// after
const upcomingByDate = events
  .filter((e) => e.status === 'upcoming' && !isEventArchived(e))
  .sort(...)
```
Apply `&& !isEventArchived(e)` to all `status === 'upcoming'` filters in Dashboard.tsx.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): filter archived events from Events For You"
```

---

### Task 6: Organizer EventsList — Upcoming / Past tabs

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventsList.tsx`

- [ ] **Step 1: Update React import and add isEventArchived import**

The file currently has `import { useEffect } from 'react'`. **Replace** that line (do not add a second import line):
```ts
import { useEffect, useState } from 'react'
```

Also add:
```ts
import { isEventArchived } from '../../../lib/dates'
```

- [ ] **Step 2: Add tab state inside OrgEventsList**

```ts
const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
```

- [ ] **Step 3: Compute tab-filtered events**

Add after `const { events, fetchEvents } = useEventsStore()`:
```ts
const upcomingEvents = events.filter((e) => !isEventArchived(e))
const pastEvents     = events.filter((e) => isEventArchived(e))
const displayEvents  = activeTab === 'upcoming' ? upcomingEvents : pastEvents
```

- [ ] **Step 4: Replace `events.map(...)` with `displayEvents.map(...)`**

In the JSX, change all references from `events` to `displayEvents` in the render loop.

- [ ] **Step 5: Add `key={activeTab}` to the motion.div list wrapper**

The existing `<motion.div variants={staggerContainer} initial="hidden" animate="visible">` that wraps the event cards only triggers `initial="hidden"` on first mount. Add `key={activeTab}` so framer-motion remounts the wrapper on tab switch and re-runs the stagger animation:
```tsx
<motion.div
  key={activeTab}
  className="p-4 space-y-3"
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
```

- [ ] **Step 6: Add tab UI — insert inside the sticky header, below the title row**

```tsx
{/* Upcoming / Past tabs */}
<div className="flex gap-1 bg-white/20 p-1 rounded-xl w-fit mt-3">
  {(['upcoming', 'past'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
        activeTab === tab
          ? 'bg-white text-blue'
          : 'text-white/70 hover:text-white'
      }`}
    >
      {tab} ({tab === 'upcoming' ? upcomingEvents.length : pastEvents.length})
    </button>
  ))}
</div>
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 8: Manual verify**

Open `/organizer/events`. Confirm "Upcoming" tab shows only non-archived events. "Past" tab shows archived events. Counts update correctly. Switching tabs re-triggers the stagger animation.

- [ ] **Step 9: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventsList.tsx
git commit -m "feat(organizer): add Upcoming/Past tabs to events list"
```

---

## Chunk 3: Cancel Registration

### Task 7: Add cancelRegistration to store

**Files:**
- Modify: `apps/member/src/stores/useEventsStore.ts`

- [ ] **Step 1: Add cancelRegistration to EventsState interface**

Inside the `interface EventsState` block, add:
```ts
cancelRegistration: (regId: string) => Promise<void>
```

- [ ] **Step 2: Add implementation inside the create() call**

After the `register` action, add:
```ts
cancelRegistration: async (regId) => {
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled', qr_code_token: null })
    .eq('id', regId)
  if (error) throw error
  set((s) => ({
    registrations: s.registrations.map((r) =>
      r.id === regId
        ? { ...r, status: 'cancelled' as const, qr_code_token: null }
        : r
    ),
  }))
},
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/stores/useEventsStore.ts
git commit -m "feat(store): add cancelRegistration action"
```

---

### Task 8: EventPending — guard for cancelled status

**Files:**
- Modify: `apps/member/src/pages/events/EventPending.tsx`

- [ ] **Step 1: Add cancelled-status guard to the existing status useEffect**

Find the existing `useEffect` that navigates to ticket on `approved`:
```ts
useEffect(() => {
  if (reg?.status === 'approved') {
    navigate(`/events/${id}/ticket`, { replace: true })
  }
}, [reg?.status, id, navigate])
```

Update to also handle `cancelled`:
```ts
useEffect(() => {
  if (reg?.status === 'approved') {
    navigate(`/events/${id}/ticket`, { replace: true })
  }
  if (reg?.status === 'cancelled') {
    navigate('/events', { replace: true })
  }
}, [reg?.status, id, navigate])
```

This handles the case where a member has the pending screen open in one tab and cancels in another — the store update triggers the navigation.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/events/EventPending.tsx
git commit -m "feat(pending): navigate away when registration is cancelled"
```

---

### Task 9: EventTicket — cancel button + double-confirm sheets

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx`

- [ ] **Step 1: Add imports**

Add to existing imports:
```ts
import { useEventsStore } from '../../stores/useEventsStore'  // already imported
// Add AlertTriangle to lucide imports:
import { ArrowLeft, MapPin, RefreshCw, CheckCircle2, Zap, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 2: Add cancelRegistration to the existing useEventsStore destructure + new state**

Find the existing destructure (around line 61):
```ts
const { events, registrations } = useEventsStore()
```
Add `cancelRegistration` to it:
```ts
const { events, registrations, cancelRegistration } = useEventsStore()
```

Then after the existing state declarations, add:
```ts
const [cancelStep, setCancelStep] = useState<null | 'first' | 'second'>(null)
const [isCancelling, setIsCancelling]     = useState(false)
const [cancelError, setCancelError]       = useState<string | null>(null)
```

- [ ] **Step 3: Add handleConfirmCancel function**

```ts
const handleConfirmCancel = async () => {
  if (!reg) return
  setIsCancelling(true)
  setCancelError(null)
  try {
    await cancelRegistration(reg.id)
    navigate('/events', { replace: true })
  } catch {
    setCancelError('Failed to cancel. Please try again.')
    setIsCancelling(false)
  }
}
```

- [ ] **Step 4: Add cancel button below the info rows in the white ticket body**

Find the closing `</motion.div>` of the `staggerRows` section (the member info rows). Directly after it, still inside the white `bg-white` ticket body div, add:

```tsx
{/* Cancel registration — only shown when not yet checked in */}
{!reg.checked_in && !checkedIn && (
  <div className="px-6 pb-5">
    <button
      onClick={() => setCancelStep('first')}
      className="w-full py-2.5 text-sm font-semibold text-red border border-red/20 rounded-xl hover:bg-red/5 transition-colors"
    >
      Cancel Registration
    </button>
  </div>
)}
```

Note: `!reg.checked_in` reads from the **store** (initial DB value), `!checkedIn` reads from local Realtime state. Both must be false to show the button.

- [ ] **Step 5: Add the two bottom sheets — place before the closing `</div>` of the main container**

```tsx
{/* ── Cancel confirmation sheets ── */}
<AnimatePresence>
  {cancelStep && (
    <motion.div
      key="cancel-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-30 flex items-end"
      onClick={() => { if (!isCancelling) setCancelStep(null) }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full bg-white rounded-t-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {cancelStep === 'first' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red" />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">
              Cancel your registration?
            </h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              You'll lose your spot for <span className="font-semibold text-slate-700">{event.title}</span>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelStep(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700"
              >
                Keep my spot
              </button>
              <button
                onClick={() => setCancelStep('second')}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-sm font-bold text-slate-900"
              >
                Yes, continue →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red" />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">
              Are you absolutely sure?
            </h3>
            <p className="text-sm text-slate-500 text-center mb-2">
              You will be permanently removed from the attendee list.
            </p>
            {cancelError && (
              <p className="text-xs text-red text-center mb-2">{cancelError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setCancelStep('first')}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                Go back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-2xl bg-red text-white text-sm font-bold disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling…' : 'Cancel Registration'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 7: Manual verify**

1. Open an approved ticket. Confirm "Cancel Registration" button appears at bottom (when not checked in).
2. Tap it — first sheet appears with event title, "Keep my spot" and "Yes, continue" buttons.
3. Tap "Yes, continue" — second sheet appears with red destructive button.
4. Tap "Go back" — returns to first sheet.
5. Tap "Cancel Registration" — navigates to `/events`. Registration no longer appears in My Tickets.
6. For a checked-in registration: confirm cancel button does NOT appear.

- [ ] **Step 8: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "feat(ticket): add double-confirm cancel registration flow"
```

---

## Chunk 4: Manual Check-in (Organizer)

### Task 10: Update ApprovalCard — checked_in + onCheckIn

**Files:**
- Modify: `apps/member/src/components/ApprovalCard.tsx`

- [ ] **Step 1: Add checked_in to Registration interface and onCheckIn to props**

```ts
export interface Registration {
  id: string
  member_name: string
  member_email: string
  school_or_company: string
  event_title: string
  registered_at: string
  status: 'pending' | 'approved' | 'rejected'
  checked_in?: boolean   // ← new
}

interface ApprovalCardProps {
  registration: Registration
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onRevert: (id: string) => void
  onCheckIn?: (id: string) => void  // ← new (optional — not all callers need it)
}
```

- [ ] **Step 2: Update the approved status section**

Find the current `approved` block:
```tsx
{registration.status === 'approved' && (
  <p className="text-xs text-green font-semibold text-center py-1 flex items-center justify-center gap-1">
    <CheckCircle2 className="w-3.5 h-3.5" />
    Approved — QR ticket sent
  </p>
)}
```

Replace with:
```tsx
{registration.status === 'approved' && !registration.checked_in && (
  <button
    onClick={() => onCheckIn?.(registration.id)}
    className="w-full py-2 text-sm font-semibold rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors flex items-center justify-center gap-1.5"
  >
    <UserCheck className="w-3.5 h-3.5" />
    Check In
  </button>
)}
{registration.status === 'approved' && registration.checked_in && (
  <p className="text-xs text-green font-semibold text-center py-1 flex items-center justify-center gap-1">
    <CheckCircle2 className="w-3.5 h-3.5" />
    Checked In
  </p>
)}
```

- [ ] **Step 3: Add UserCheck to lucide imports**

```ts
import { Check, X, CheckCircle2, XCircle, RotateCcw, UserCheck } from 'lucide-react'
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/components/ApprovalCard.tsx
git commit -m "feat(approval-card): add checked_in display + Check In button"
```

---

### Task 11: EventRegistrants — fetch checked_in + handleCheckIn

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventRegistrants.tsx`

- [ ] **Step 1: Add checked_in to Registration mapping and query**

Find the `supabase.from('event_registrations').select(...)` call:
```ts
.select('id, status, registered_at, profiles(full_name, email, school_or_company)')
```

Change to:
```ts
.select('id, status, registered_at, checked_in, profiles(full_name, email, school_or_company)')
.neq('status', 'cancelled')
```

- [ ] **Step 2: Add checked_in to the mapped Registration object**

Inside the `.map((row) => ...)`, add:
```ts
checked_in: (row.checked_in as boolean | null) ?? false,
```

- [ ] **Step 3: Import useOrganizerUser and call it inside the component**

At the top of the file, add to the existing store imports:
```ts
import { useOrganizerUser } from '../../../stores/useOrgAuthStore'
```

Inside the component function, after existing destructures:
```ts
const organizerUser = useOrganizerUser()  // returns OrganizerUser | null, has .id
```

Note: Do NOT use `useOrgAuthStore().user` — that property does not exist. `useOrganizerUser()` is the correct derived selector hook.

- [ ] **Step 4: Add sonner import + handleCheckIn**

Add `toast` import at the top of the file (the project uses `sonner`):
```ts
import { toast } from 'sonner'
```

After `handleRevert`, add:
```ts
const handleCheckIn = async (regId: string) => {
  if (!organizerUser?.id) return
  const { data, error } = await supabase.rpc('manual_checkin', {
    p_registration_id: regId,
    p_organizer_id:    organizerUser.id,
  })
  if (error || !(data as { success?: boolean })?.success) return
  const result = data as { success: boolean; member_name: string; points_awarded: number }
  setRegistrants((prev) =>
    prev.map((r) => r.id === regId ? { ...r, checked_in: true } : r)
  )
  toast.success(`${result.member_name} checked in — +${result.points_awarded} pts`)
}
```

- [ ] **Step 5: Pass onCheckIn to ApprovalCard**

Find `<ApprovalCard` in the render and add the prop:
```tsx
<ApprovalCard
  registration={reg}
  onApprove={handleApprove}
  onReject={handleReject}
  onRevert={handleRevert}
  onCheckIn={handleCheckIn}   // ← add this
/>
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 7: Manual end-to-end verify**

1. Open an event with an approved (non-checked-in) registrant.
2. On the organizer registrants page, confirm the "Check In" button appears.
3. On the member's device, open the event ticket — confirm the QR and countdown are visible.
4. Tap "Check In" on the organizer side — confirm feedback appears (alert or toast).
5. On the member side — confirm the success animation fires (green header, Signed In! card).
6. Reload the organizer registrants page — confirm the row now shows "Checked In ✓" instead of the button.

- [ ] **Step 8: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventRegistrants.tsx
git commit -m "feat(registrants): manual check-in via RPC + real-time member feedback"
```

---

## Final

- [ ] **Run full typecheck**

```bash
npm run typecheck
```
Expected: 0 errors across all packages.

- [ ] **Run build**

```bash
npm run build
```
Expected: clean Vite build, no TypeScript or bundle errors.

- [ ] **Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: post-implementation cleanup for event lifecycle features"
```
