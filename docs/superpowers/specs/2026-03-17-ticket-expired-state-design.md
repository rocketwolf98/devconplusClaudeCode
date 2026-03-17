# Spec: Ticket Expired / Event Ended State

**Date:** 2026-03-17
**Status:** Approved
**Scope:** `apps/member/src/pages/events/EventTicket.tsx` only

---

## Problem

Two gaps in the `EventTicket` page allow a used or expired ticket to still display an active QR code:

1. **Past event, not checked in** — when `event.status === 'past'` and the member was never scanned, the ticket page still shows the QR code refreshing. The `generate-qr-token` edge function is called repeatedly, and there is no visual indication that the ticket is expired.

2. **Initialization bug (checked-in flash)** — `checkedIn` local state is initialized as `false` regardless of `reg.checked_in` in the store. On page reload after being scanned, the QR is briefly displayed before the async Realtime subscription fetch sets `checkedIn = true`. This is a security concern: a user could screenshot the QR during this window.

Both issues manifest as the QR code being visible and actively refreshing when it should not be.

---

## Approach: Third AnimatePresence Branch + Initialization Fix

All changes are confined to `EventTicket.tsx`. No new components, no new routes, no store changes.

### Three ticket display states

The existing `<AnimatePresence>` block inside the QR section switches between two states today:
- `checkedIn === true` → green "Signed In!" card
- default → QR countdown

Add a third branch:

| Priority | Condition | Display |
|----------|-----------|---------|
| 1 | `checkedIn === true` | Green "Signed In!" card — existing, unchanged |
| 2 | `event.status === 'past' && !checkedIn` | Neutral "Event Ended" card — new |
| 3 | default | QR countdown — existing, unchanged |

Priority order matters: a member who was checked in and whose event is now past sees "Signed In!" (their attendance was recorded), not "Event Ended".

### "Event Ended" card

Rendered inside the same `w-[240px] h-[240px]` container as the other two states. Uses the `CalendarOff` icon already imported in the file.

```
┌────────────────────────────────┐
│                                │
│   ┌──────────────────────┐     │
│   │  [CalendarOff icon]  │     │
│   │   bg-slate-100       │     │
│   └──────────────────────┘     │
│                                │
│       Event Ended              │  ← text-base font-black text-slate-900
│   This ticket is no longer     │  ← text-[11px] text-slate-400 text-center px-4
│         valid.                 │
│                                │
└────────────────────────────────┘
```

- Container: `w-[204px] h-[204px] bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col items-center justify-center gap-2`
- Icon container: `w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center`
- Icon: `CalendarOff` `w-9 h-9 text-slate-400`
- Entry animation: same spring entry as the "Signed In!" card (`initial={{ opacity: 0, scale: 0.82 }}`)

### Initialization fix

Move `reg` derivation above all `useState` declarations. Change `checkedIn` initial value from `false` to a lazy initializer that reads from the store:

```ts
const reg = registrations.find((r) => r.event_id === id)
// ...
const [checkedIn, setCheckedIn] = useState(() => reg?.checked_in === true)
```

This eliminates the QR flash on page reload for already-checked-in members.

### Token refresh guard

The token refresh `useEffect` currently runs whenever `reg` exists. For past events, this is wasteful and confusing. Add an early return:

```ts
useEffect(() => {
  if (!reg || event?.status === 'past') return
  // ... rest of existing logic
}, [reg?.id, retryKey])
```

### Hint text update

The hint text at the bottom of the page has two branches today. Add a third:

```ts
eventEnded
  ? 'This event has already ended.'
  : checkedIn
    ? "You're all set — enjoy the event!"
    : 'Show this QR code at the venue entrance.\nKeep this screen open — QR refreshes automatically.'
```

Where `eventEnded` is a local derived constant: `const eventEnded = event.status === 'past' && !checkedIn`

---

## Files Changed

| File | Change |
|------|--------|
| `apps/member/src/pages/events/EventTicket.tsx` | Add `eventEnded` branch to AnimatePresence; fix `checkedIn` init; guard token refresh useEffect; update hint text |

---

## Out of Scope

- Server-side token invalidation for past events (edge function change)
- Showing the "Event Ended" state on the `EventDetail` page
- Organizer-facing ticket states
- Styling changes to the ticket header for the "Event Ended" case (stays theme color)
