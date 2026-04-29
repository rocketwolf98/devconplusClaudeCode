# Registrant Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an organizer taps a registrant card in the Attendees list, a full-screen detail panel slides in from the right showing the participant's full profile, form responses, and action buttons (Approve / Reject / Revert / Check-In). The list cards become purely tappable rows — all actions move exclusively to the detail view.

**Architecture:** In-page view state — `selectedRegistrant: RegistrantWithResponses | null` drives a `fixed inset-0` `motion.div` rendered inside `AnimatePresence` in `EventRegistrants.tsx`. No new route. The detail view holds its own `localReg` copy of the registration and updates it in-place after each action; the parent `registrants` array is updated simultaneously by the existing handlers (now returning `Promise<boolean>`).

**Tech Stack:** React 19, framer-motion, Tailwind CSS v3, solar-icon-set, Supabase, TypeScript strict

---

## File Map

| File | Action | What changes |
|---|---|---|
| `apps/member/src/components/ApprovalCard.tsx` | Modify | Remove all action button props/JSX; add `onClick` prop + chevron; whole card is `motion.div` |
| `apps/member/src/pages/organizer/events/EventRegistrants.tsx` | Modify | Update handlers to return boolean; add `selectedRegistrant` state; remove `expandedResponseIds`, `toggleResponses`, `FormResponsesPanel`, `handleApproveAll`; add `RegistrantDetailView` component inline; wire `AnimatePresence` |

---

## Task 1: Simplify ApprovalCard into a tappable row

**Files:**
- Modify: `apps/member/src/components/ApprovalCard.tsx`

The card loses all action buttons. The whole card becomes a `motion.div` with `onClick` and a trailing `AltArrowRightOutline` chevron. The checked-in indicator stays (read-only info).

- [ ] **Step 1: Replace the full content of `ApprovalCard.tsx`**

```tsx
import { memo } from 'react'
import { AltArrowRightOutline, CheckCircleOutline } from 'solar-icon-set'
import { motion } from 'framer-motion'
import { StatusBadge } from './StatusBadge'

export interface Registration {
  id: string
  member_name: string
  member_email: string
  school_or_company: string
  event_title: string
  registered_at: string
  status: 'pending' | 'approved' | 'rejected'
  checked_in?: boolean
}

interface ApprovalCardProps {
  registration: Registration
  onClick?: () => void
}

function ApprovalCardComponent({ registration, onClick }: ApprovalCardProps) {
  const initials = registration.member_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const formattedDate = new Date(registration.registered_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card cursor-pointer"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center text-blue text-md3-body-md font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-md3-body-md font-bold text-slate-900 truncate">{registration.member_name}</p>
          <p className="text-md3-label-md text-slate-400 truncate">{registration.member_email}</p>
          <p className="text-md3-label-md text-slate-400 truncate">{registration.school_or_company}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={registration.status} />
          <AltArrowRightOutline color="#CBD5E1" className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl px-3 py-2">
        <p className="text-md3-label-md text-slate-400 mb-0.5">Event</p>
        <p className="text-md3-body-md font-semibold text-slate-700 truncate">{registration.event_title}</p>
        <p className="text-md3-label-md text-slate-400 mt-1">Registered {formattedDate}</p>
      </div>

      {registration.status === 'approved' && registration.checked_in && (
        <p className="text-md3-label-md text-green font-semibold text-center pt-3 flex items-center justify-center gap-1">
          <CheckCircleOutline color="#21C45D" className="w-3.5 h-3.5" />
          Checked In
        </p>
      )}
    </motion.div>
  )
}

export const ApprovalCard = memo(ApprovalCardComponent)
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `AltArrowRightOutline` is not found, replace with `AltArrowDownOutline` and add `style={{ transform: 'rotate(-90deg)' }}`.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/components/ApprovalCard.tsx
git commit -m "refactor: simplify ApprovalCard to tappable row — remove action buttons, add chevron"
```

---

## Task 2: Update action handlers in EventRegistrants to return `Promise<boolean>`

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventRegistrants.tsx` (lines ~231–303)

The detail view needs to know whether each action succeeded before updating its local state. All four handlers are updated to return `boolean`.

- [ ] **Step 1: Replace `handleApprove` (around line 231)**

```ts
const handleApprove = async (regId: string): Promise<boolean> => {
  const qrToken = 'DCN-' + crypto.randomUUID().slice(0, 8).toUpperCase()
  const { error } = await supabase
    .from('event_registrations')
    .update({
      status:        'approved',
      approved_at:   new Date().toISOString(),
      qr_code_token: qrToken,
    })
    .eq('id', regId)
  if (error) return false
  setRegistrants((prev) =>
    prev.map((r) => (r.id === regId ? { ...r, status: 'approved' as const } : r))
  )
  const reg = registrants.find((r) => r.id === regId)
  if (reg?.member_email) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session && event) {
      const eventDate = event.event_date
        ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : 'Date TBA'
      const ticketUrl = `${window.location.origin}/events/${event.slug ?? event.id}/ticket`
      void supabase.functions.invoke('send-email', {
        body: {
          to: reg.member_email,
          subject: `You're approved for ${event.title}!`,
          html: buildApprovedEmail({ memberName: reg.member_name, eventTitle: event.title, eventDate, eventLocation: event.location ?? undefined, pointsValue: event.points_value ?? 100, ticketUrl }),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    }
  }
  return true
}
```

- [ ] **Step 2: Replace `handleReject` (around line 267)**

```ts
const handleReject = async (regId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'rejected' })
    .eq('id', regId)
  if (error) return false
  setRegistrants((prev) =>
    prev.map((r) => (r.id === regId ? { ...r, status: 'rejected' as const } : r))
  )
  return true
}
```

- [ ] **Step 3: Replace `handleRevert` (around line 279)**

```ts
const handleRevert = async (regId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'pending', approved_at: null, qr_code_token: null })
    .eq('id', regId)
  if (error) return false
  setRegistrants((prev) =>
    prev.map((r) => (r.id === regId ? { ...r, status: 'pending' as const } : r))
  )
  return true
}
```

- [ ] **Step 4: Replace `handleCheckIn` (around line 291)**

```ts
const handleCheckIn = async (regId: string): Promise<boolean> => {
  if (!organizerUser?.id) return false
  const { data, error } = await supabase.rpc('manual_checkin', {
    p_registration_id: regId,
    p_organizer_id:    organizerUser.id,
  })
  if (error || !(data as unknown as { success?: boolean })?.success) return false
  const result = data as unknown as { success: boolean; member_name: string; points_awarded: number }
  setRegistrants((prev) =>
    prev.map((r) => r.id === regId ? { ...r, checked_in: true } : r)
  )
  toast.success(`${result.member_name} checked in — +${result.points_awarded} pts`)
  return true
}
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventRegistrants.tsx
git commit -m "refactor: action handlers return Promise<boolean> for detail view feedback"
```

---

## Task 3: Add `RegistrantDetailView` and wire up `EventRegistrants`

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventRegistrants.tsx`

This is the main task. It has three parts: update imports + state, add the `RegistrantDetailView` component, update the JSX.

- [ ] **Step 1: Update the solar-icon-set import at the top of `EventRegistrants.tsx`**

Replace the existing import line:
```ts
import { ArrowLeftOutline, CheckCircleOutline, AltArrowDownOutline, ClipboardListOutline, UserSpeakOutline, UsersGroupRoundedOutline } from 'solar-icon-set'
```

With:
```ts
import { ArrowLeftOutline, CheckCircleOutline, CloseCircleLineDuotone, CloseCircleOutline, RestartOutline, UserCheckOutline, ClipboardListOutline, UserSpeakOutline, UsersGroupRoundedOutline } from 'solar-icon-set'
```

(`AltArrowDownOutline` removed — was only used in `FormResponsesPanel`. New icons for detail view action bar added.)

- [ ] **Step 2: Add `StatusBadge` import (after the existing ApprovalCard import line)**

```ts
import { StatusBadge } from '../../../components/StatusBadge'
```

- [ ] **Step 3: Replace the `FormResponsesPanel` component (lines ~36–105) with `RegistrantDetailView`**

Delete the entire `FormResponsesPanel` function (lines 36–105) and the `expandedResponseIds` / `toggleResponses` state (lines ~139–147). In their place, add the `RegistrantDetailViewProps` interface and `RegistrantDetailView` component:

```tsx
// ── Registrant Detail View ────────────────────────────────────────────────────

interface RegistrantDetailViewProps {
  registration: RegistrantWithResponses
  formSchema: CustomFormField[]
  eventTitle: string
  onClose: () => void
  onApprove: (id: string) => Promise<boolean>
  onReject: (id: string) => Promise<boolean>
  onRevert: (id: string) => Promise<boolean>
  onCheckIn: (id: string) => Promise<boolean>
}

function RegistrantDetailView({
  registration,
  formSchema,
  eventTitle,
  onClose,
  onApprove,
  onReject,
  onRevert,
  onCheckIn,
}: RegistrantDetailViewProps) {
  const [localReg, setLocalReg] = useState(registration)

  const initials = localReg.member_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const firstName = localReg.member_name.split(' ')[0]
  const lastInitial = localReg.member_name.split(' ')[1]?.[0]
  const shortName = lastInitial ? `${firstName} ${lastInitial}.` : firstName

  const formattedDate = new Date(localReg.registered_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const hasResponses = formSchema.length > 0 && !!localReg.form_responses
  const answeredCount = formSchema.filter(f => {
    const v = localReg.form_responses?.[f.id]
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  }).length

  const handleApproveClick = async () => {
    const ok = await onApprove(localReg.id)
    if (ok) setLocalReg(prev => ({ ...prev, status: 'approved' as const }))
  }
  const handleRejectClick = async () => {
    const ok = await onReject(localReg.id)
    if (ok) setLocalReg(prev => ({ ...prev, status: 'rejected' as const }))
  }
  const handleRevertClick = async () => {
    const ok = await onRevert(localReg.id)
    if (ok) setLocalReg(prev => ({ ...prev, status: 'pending' as const }))
  }
  const handleCheckInClick = async () => {
    const ok = await onCheckIn(localReg.id)
    if (ok) setLocalReg(prev => ({ ...prev, checked_in: true }))
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-slate-50 flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      {/* Header */}
      <div className="bg-[#1152d4] pt-14 pb-4 px-4 flex items-center gap-3 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center active:bg-white/40 transition-colors shadow-sm shrink-0"
        >
          <ArrowLeftOutline color="white" className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-[24px] font-semibold font-proxima leading-none tracking-tight truncate">
            {shortName}
          </h1>
          <p className="text-white/70 text-[13px] font-proxima truncate leading-none mt-0.5">
            {eventTitle}
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Avatar hero */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue text-2xl font-black">
            {initials}
          </div>
          <div>
            <p className="text-md3-headline-sm font-bold text-slate-900">{localReg.member_name}</p>
            <p className="text-md3-body-sm text-slate-400 mt-0.5">{localReg.member_email}</p>
            {localReg.school_or_company && (
              <p className="text-md3-body-sm text-slate-400">{localReg.school_or_company}</p>
            )}
          </div>
          <StatusBadge status={localReg.status} />
        </div>

        {/* Registration info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Registered</p>
            <p className="text-md3-body-md text-slate-800">{formattedDate}</p>
          </div>
          {localReg.checked_in && (
            <>
              <div className="border-t border-slate-100" />
              <p className="text-md3-label-md text-green font-semibold flex items-center gap-1.5">
                <CheckCircleOutline color="#21C45D" className="w-3.5 h-3.5" />
                Checked In
              </p>
            </>
          )}
        </div>

        {/* Custom form responses — always expanded, only rendered if data exists */}
        {hasResponses && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-md3-label-lg font-bold text-slate-500 flex items-center gap-1.5">
                <ClipboardListOutline color="#94A3B8" className="w-3.5 h-3.5" />
                Registration Responses
              </p>
              <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px] font-bold">
                {answeredCount}/{formSchema.length}
              </span>
            </div>
            <div className="space-y-3">
              {formSchema.map((field, i) => {
                const answer = localReg.form_responses?.[field.id]
                const isEmpty =
                  answer === undefined || answer === null || answer === '' ||
                  (Array.isArray(answer) && answer.length === 0)
                return (
                  <div key={field.id}>
                    {i > 0 && <div className="border-t border-slate-100 mb-3" />}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                      {field.label}{field.required ? ' *' : ''}
                    </p>
                    <p className="text-md3-body-md">
                      {isEmpty
                        ? <span className="text-slate-300 italic">No answer</span>
                        : <span className="text-slate-800">{Array.isArray(answer) ? (answer as unknown[]).join(', ') : String(answer)}</span>
                      }
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 pb-safe shrink-0">
        {localReg.status === 'pending' && (
          <div className="flex gap-2">
            <motion.button
              onClick={handleRejectClick}
              className="flex-1 py-3 text-md3-body-md font-semibold rounded-xl border border-slate-200 text-slate-500 hover:bg-red/5 hover:border-red hover:text-red transition-colors flex items-center justify-center gap-1.5"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <CloseCircleLineDuotone color="#EF4444" className="w-4 h-4" />
              Reject
            </motion.button>
            <motion.button
              onClick={handleApproveClick}
              className="flex-1 py-3 text-md3-body-md font-semibold rounded-xl bg-blue text-white hover:bg-blue-dark transition-colors flex items-center justify-center gap-1.5"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <CheckCircleOutline color="white" className="w-4 h-4" />
              Approve
            </motion.button>
          </div>
        )}
        {localReg.status === 'approved' && !localReg.checked_in && (
          <motion.button
            onClick={handleCheckInClick}
            className="w-full py-3 text-md3-body-md font-semibold rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors flex items-center justify-center gap-1.5"
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <UserCheckOutline color="#21C45D" className="w-4 h-4" />
            Check In
          </motion.button>
        )}
        {localReg.status === 'approved' && localReg.checked_in && (
          <p className="text-md3-body-md text-green font-semibold text-center py-3 flex items-center justify-center gap-1.5">
            <CheckCircleOutline color="#21C45D" className="w-4 h-4" />
            Checked In
          </p>
        )}
        {localReg.status === 'rejected' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-md3-label-md text-red font-semibold flex items-center gap-1.5">
              <CloseCircleOutline color="#EF4444" className="w-3.5 h-3.5 shrink-0" />
              Registration rejected
            </p>
            <motion.button
              onClick={handleRevertClick}
              className="flex items-center gap-1.5 text-md3-label-md font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors shrink-0"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <RestartOutline color="#64748B" className="w-3 h-3" />
              Undo
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Update state declarations in `OrgEventRegistrants` (around line 132)**

Remove:
```ts
const [expandedResponseIds, setExpandedResponseIds] = useState<Set<string>>(new Set())

const toggleResponses = (regId: string) =>
  setExpandedResponseIds(prev => {
    const next = new Set(prev)
    if (next.has(regId)) next.delete(regId)
    else next.add(regId)
    return next
  })
```

Add in its place:
```ts
const [selectedRegistrant, setSelectedRegistrant] = useState<RegistrantWithResponses | null>(null)
```

- [ ] **Step 5: Remove `handleApproveAll` function (around line 305)**

Delete the entire function:
```ts
const handleApproveAll = async () => {
  const pending = registrants.filter((r) => r.status === 'pending')
  await Promise.all(pending.map((r) => handleApprove(r.id)))
}
```

- [ ] **Step 6: Remove the "Approve All Pending" button from the JSX (around line 416)**

Delete the entire `AnimatePresence` block containing the Approve All button:
```tsx
<AnimatePresence>
  {filter === 'pending' && counts.pending > 0 && (
    <motion.button
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={handleApproveAll}
      className="mb-4 px-4 py-2 bg-green text-white text-md3-body-md font-bold rounded-xl hover:bg-green/90 transition-colors flex items-center gap-2"
      whileTap={{ scale: 0.97 }}
    >
      <CheckCircleOutline className="w-4 h-4" />
      Approve All Pending ({counts.pending})
    </motion.button>
  )}
</AnimatePresence>
```

- [ ] **Step 7: Update the registrant list items JSX (around line 475)**

Replace the existing `filtered.map` block:
```tsx
{filtered.map((reg) => (
  <motion.div key={reg.id} variants={cardItem} className="space-y-1.5">
    <ApprovalCard
      registration={reg}
      onApprove={handleApprove}
      onReject={handleReject}
      onRevert={handleRevert}
      onCheckIn={handleCheckIn}
    />
    {formSchema.length > 0 && reg.form_responses && (
      <FormResponsesPanel
        schema={formSchema}
        responses={reg.form_responses}
        isExpanded={expandedResponseIds.has(reg.id)}
        onToggle={() => toggleResponses(reg.id)}
      />
    )}
  </motion.div>
))}
```

With:
```tsx
{filtered.map((reg) => (
  <motion.div key={reg.id} variants={cardItem}>
    <ApprovalCard
      registration={reg}
      onClick={() => setSelectedRegistrant(reg)}
    />
  </motion.div>
))}
```

- [ ] **Step 8: Add `AnimatePresence` + `RegistrantDetailView` just before the closing `</div>` of the root div (after `SendAnnouncementSheet`)**

```tsx
<AnimatePresence>
  {selectedRegistrant && (
    <RegistrantDetailView
      key={selectedRegistrant.id}
      registration={selectedRegistrant}
      formSchema={formSchema}
      eventTitle={event?.title ?? ''}
      onClose={() => setSelectedRegistrant(null)}
      onApprove={handleApprove}
      onReject={handleReject}
      onRevert={handleRevert}
      onCheckIn={handleCheckIn}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 9: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors. Common issues to fix if they appear:
- `AltArrowRightOutline` not found → use `AltArrowDownOutline` with `style={{ transform: 'rotate(-90deg)' }}`
- `text-md3-headline-sm` not recognized → replace with `text-[24px]` (same size per tailwind config)
- `pb-safe` not recognized → replace with `pb-4`

- [ ] **Step 10: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventRegistrants.tsx
git commit -m "feat: registrant detail page — full-screen slide-in with profile, form responses, and actions"
```

---

## Task 4: Build verification and manual smoke test

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: exits 0. If it fails, run `npm run typecheck` first to surface the TS errors.

- [ ] **Step 2: Start dev server and verify the feature**

```bash
npm run dev:member
```

Open `http://localhost:5173` in a browser. Navigate to an organizer account → any event → Attendees.

Check:
1. Each registrant card shows a grey chevron on the right (no Approve/Reject buttons on the card)
2. Tapping any card opens the detail panel sliding in from the right with a spring animation
3. The blue header shows the registrant's short name + event subtitle
4. The avatar hero shows initials, full name, email, school, status badge
5. Custom form responses are shown fully expanded (if the event has a custom form schema)
6. The action bar at the bottom shows the correct controls for the current status:
   - Pending → Reject + Approve
   - Approved (not checked in) → Check In
   - Approved (checked in) → static "Checked In" text
   - Rejected → "Registration rejected" + Undo
7. Tapping Approve → status badge flips to Approved, action bar flips to Check In, email fires
8. Tapping the back button closes the panel with a rightward slide
9. After closing, the list card for that registrant shows the updated status badge

- [ ] **Step 3: Final commit if any minor fixes were applied during smoke test**

```bash
git add -p
git commit -m "fix: address smoke test issues in registrant detail view"
```

(Only run this step if Step 2 required changes.)
