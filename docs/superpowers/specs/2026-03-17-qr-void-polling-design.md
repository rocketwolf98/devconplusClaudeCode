# QR Void — Polling Fallback Design Spec
> Date: 2026-03-17
> Feature: Polling fallback to close Realtime sync lag on the member QR ticket screen
> Branch: feat/sprint2-qa-feedback

---

## Overview

The member QR ticket screen (`EventTicket.tsx`) already detects check-in via a Supabase Realtime subscription and switches to a green "Signed In!" state when `checked_in = true`. However, Realtime can take several seconds to propagate, leaving a window where the QR still appears scannable.

This spec adds a **polling fallback** that re-fetches the registration status every 5 seconds. If Realtime is fast, polling is a no-op. If Realtime is slow, polling closes the gap without requiring any backend changes.

The organizer scanner (`QRScanner.tsx`) already handles `already_checked_in` correctly and is **not changed** by this feature.

---

## Requirements

1. `EventTicket.tsx` polls the registration status every **5 seconds** alongside the existing Realtime subscription.
2. Polling checks whether `reg.checked_in === true` for the current registration.
3. When `checked_in = true` is detected by the poll, `setCheckedIn(true)` is called — identical to the Realtime handler.
4. The interval is **cleared** when:
   - The component unmounts.
   - `checkedIn` becomes `true` (no further polling needed).
5. Realtime remains the fast path. Polling is a silent fallback only.
6. No backend changes (Edge Functions, DB schema, store).
7. No new store methods — the poll reads registration data using the existing store or a direct lookup.

---

## Implementation

### `apps/member/src/pages/events/EventTicket.tsx`

Add a second `useEffect` for the polling interval. It runs once on mount (after `reg` is available) and clears itself on cleanup:

```ts
useEffect(() => {
  if (!reg || checkedIn) return

  const interval = setInterval(() => {
    const latest = registrations.find((r) => r.id === reg.id)
    if (latest?.checked_in) {
      setCheckedIn(true)
    }
  }, 5000)

  return () => clearInterval(interval)
}, [reg, checkedIn, registrations])
```

- `registrations` comes from `useEventsStore` (already destructured in the component).
- The store is not re-fetched on each tick — the poll reads the in-memory store value, which Zustand updates when Realtime fires on the store level (if wired) or stays as mock data in dev.
- When real Supabase is wired, the store's Realtime handler updates `registrations` — the poll then sees the updated value on its next tick.

---

## Files Affected

| File | Change |
|------|--------|
| `apps/member/src/pages/events/EventTicket.tsx` | Add polling `useEffect` alongside existing Realtime subscription |

**Unchanged:**
- `QRScanner.tsx`
- `useEventsStore.ts`
- All Edge Functions
- All mock data

---

## Out of Scope

- Server-side token invalidation on `generate-qr-token`
- Shortening Realtime subscription scope
- Any organizer-side changes
- Admin side (deferred)
