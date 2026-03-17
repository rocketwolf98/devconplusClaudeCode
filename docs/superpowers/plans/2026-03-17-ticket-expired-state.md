# Ticket Expired / Event Ended State — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the EventTicket page from showing an active QR code when an event has ended, and fix the flash of QR on page reload for already-checked-in members.

**Architecture:** All changes in a single file (`EventTicket.tsx`). Move `event`/`reg` derivations above `useState` so `checkedIn` can be seeded from the store. Add an `eventEnded` derived boolean. Insert a third `AnimatePresence` branch for the "Event Ended" card between the existing "Signed In!" and QR branches. Guard the token refresh `useEffect` for past events.

**Tech Stack:** React 19, framer-motion (AnimatePresence), lucide-react, Zustand v5, TypeScript strict

---

## File Map

| File | Action |
|------|--------|
| `apps/member/src/pages/events/EventTicket.tsx` | Modify — 5 targeted edits, no structural rewrite |

---

## Task 1: Add `CalendarOff` to the lucide import

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx:3`

Context: `CalendarOff` is the icon for the "Event Ended" card. `CalendarPlus` is already imported (for Add to Calendar) — `CalendarOff` is a distinct icon and must be added.

- [ ] **Step 1: Add `CalendarOff` to the import**

Find line 3 of `apps/member/src/pages/events/EventTicket.tsx`:

```ts
import { ArrowLeft, MapPin, RefreshCw, CheckCircle2, Zap, AlertTriangle, CalendarPlus } from 'lucide-react'
```

Replace with:

```ts
import { ArrowLeft, MapPin, RefreshCw, CheckCircle2, Zap, AlertTriangle, CalendarOff, CalendarPlus } from 'lucide-react'
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "fix(EventTicket): add CalendarOff icon import"
```

---

## Task 2: Move `event`/`reg` derivations above `useState`; fix `checkedIn` init; add `eventEnded`

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx:62-81`

Context: `checkedIn` is currently initialized as `false` on every render, even when `reg.checked_in` is `true` in the store. This causes a brief QR flash on page reload after being scanned. The fix seeds the initial state from `reg.checked_in`. To do this, `reg` must be derived before the `useState` calls. `event` is moved at the same time since it's closely related. `eventEnded` is a derived boolean used in the AnimatePresence and hint text — placed after `checkedIn` so it can read the live state.

- [ ] **Step 1: Replace the store/useState block**

Find this block in `EventTicket.tsx` (lines 62–81):

```ts
  const { events, registrations, cancelRegistration } = useEventsStore()
  const { user } = useAuthStore()
  const { activeTheme } = useThemeStore()
  const theme = activeTheme()

  const [token, setToken] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [checkedIn, setCheckedIn] = useState(false)

  const [showCalSheet, setShowCalSheet] = useState(false)

  const [cancelStep, setCancelStep] = useState<null | 'first' | 'second'>(null)
  const [isCancelling, setIsCancelling]     = useState(false)
  const [cancelError, setCancelError]       = useState<string | null>(null)

  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id)
```

Replace with:

```ts
  const { events, registrations, cancelRegistration } = useEventsStore()
  const { user } = useAuthStore()
  const { activeTheme } = useThemeStore()
  const theme = activeTheme()

  // Derived early so they can seed useState initial values
  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id)

  const [token, setToken] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [checkedIn, setCheckedIn] = useState(() => reg?.checked_in === true)

  const [showCalSheet, setShowCalSheet] = useState(false)

  const [cancelStep, setCancelStep] = useState<null | 'first' | 'second'>(null)
  const [isCancelling, setIsCancelling]     = useState(false)
  const [cancelError, setCancelError]       = useState<string | null>(null)

  const eventEnded = event?.status === 'past' && !checkedIn
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "fix(EventTicket): seed checkedIn from store; add eventEnded derived state"
```

---

## Task 3: Guard the token refresh `useEffect` for past events

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx` (the token rotation `useEffect`)

Context: The token refresh loop calls `generate-qr-token` repeatedly. For past events, this is wasteful — no valid scan can happen. Adding an early return stops the loop and avoids the "Refreshing…" spinner showing on expired tickets.

- [ ] **Step 1: Add the early return guard**

Find the opening of the token rotation `useEffect`:

```ts
  // Token rotation — fetch on mount and 6s before each expiry
  useEffect(() => {
    if (!reg) return
```

Replace with:

```ts
  // Token rotation — fetch on mount and 6s before each expiry
  useEffect(() => {
    if (!reg || event?.status === 'past') return
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "fix(EventTicket): stop QR token refresh for past events"
```

---

## Task 4: Add the "Event Ended" branch to `AnimatePresence`

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx` (the QR/checked-in AnimatePresence block)

Context: The existing `AnimatePresence` block has two branches: `checkedIn` → green "Signed In!" card, default → QR countdown. A third `eventEnded` branch is inserted between them. It reuses the same entry animation, container sizing, and card styling pattern as the "Signed In!" card, but with a neutral slate palette and the `CalendarOff` icon. The `checkedIn` branch takes priority: a member who was scanned at a now-past event sees "Signed In!", not "Event Ended".

- [ ] **Step 1: Insert the `eventEnded` branch**

Find the transition between the two existing AnimatePresence branches — the start of the QR code `motion.div`:

```tsx
                  ) : (
                    <motion.div
                      key="qr-code"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.2 }}
                      className="relative flex items-center justify-center"
                    >
```

Replace with:

```tsx
                  ) : eventEnded ? (
                    <motion.div
                      key="event-ended"
                      initial={{ opacity: 0, scale: 0.82 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="w-[204px] h-[204px] bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col items-center justify-center gap-2"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                        className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center"
                      >
                        <CalendarOff className="w-9 h-9 text-slate-400" />
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.26, duration: 0.22 }}
                        className="text-base font-black text-slate-900"
                      >
                        Event Ended
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.32, duration: 0.2 }}
                        className="text-[11px] text-slate-400 text-center px-4"
                      >
                        This ticket is no longer valid.
                      </motion.p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="qr-code"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.2 }}
                      className="relative flex items-center justify-center"
                    >
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Hide countdown label for `eventEnded` state**

The countdown label / retry button is currently guarded by `!checkedIn`. Since `eventEnded` also needs to suppress it (a past-event ticket should not show "Refreshes in 30s" under the Event Ended card), update the guard.

Find:

```tsx
              {/* Countdown label / retry — hidden after check-in */}
              {!checkedIn && (
```

Replace with:

```tsx
              {/* Countdown label / retry — hidden after check-in or when event has ended */}
              {!checkedIn && !eventEnded && (
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "feat(EventTicket): add Event Ended card for past events"
```

---

## Task 5: Update the hint text for the `eventEnded` state

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx` (hint text at the bottom of the page)

Context: The hint text at the bottom currently has two branches — `checkedIn` and default. A third `eventEnded` branch is inserted between them, matching the priority order of the AnimatePresence block.

- [ ] **Step 1: Update the hint text ternary**

Find the hint text block near the bottom of `EventTicket.tsx`:

```tsx
          {checkedIn
            ? 'You\'re all set — enjoy the event!'
            : 'Show this QR code at the venue entrance.\nKeep this screen open — QR refreshes automatically.'}
```

Replace with:

```tsx
          {checkedIn
            ? 'You\'re all set — enjoy the event!'
            : eventEnded
              ? 'This event has already ended.'
              : 'Show this QR code at the venue entrance.\nKeep this screen open — QR refreshes automatically.'}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Verify no remaining `MOCK_` or stale references**

```bash
grep -n "useState(false)" apps/member/src/pages/events/EventTicket.tsx
```

Expected: no output (the `checkedIn` false initializer has been replaced).

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "fix(EventTicket): update hint text for event-ended and checked-in states"
```

---

## Done

Run a final typecheck:

```bash
npm run typecheck
```

Verify manually:
- Navigate to a ticket for a **past** event that was **not** scanned → should show the "Event Ended" card (gray `CalendarOff` icon, "Event Ended" heading, "This ticket is no longer valid." subtext) and hint "This event has already ended."
- Navigate to a ticket for a **past** event that **was** scanned (`checked_in = true`) → should show the existing green "Signed In!" card immediately with no QR flash
- Navigate to a ticket for an **upcoming** event → should show the QR countdown as before
- Reload the ticket page after being checked in → QR should not flash; "Signed In!" card shows immediately
