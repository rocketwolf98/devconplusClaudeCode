# Design Spec: Event Lifecycle Features
**Date:** 2026-03-14
**Project:** DEVCON+ Member App
**Status:** Approved

---

## Overview

Three features that complete the event lifecycle for both members and organizers:

1. **Event Archiving** — Past events hide from active lists once their end time passes
2. **Cancel Registration** — Members can withdraw from events they signed up for, with double confirmation
3. **Manual Check-in** — Organizers can check members in directly from the registrants list, awarding points instantly

---

## Feature 1: Event Archiving

### Definition

An event is considered **archived** when:
```
now > (event.end_date ?? event.event_date)
```
If `end_date` is set, that is the cutoff. If not, `event_date` (start time) is the fallback.

### Behaviour by Surface

| Surface | Behaviour |
|---|---|
| Member Discover tab (EventsList) | Archived events **hidden** |
| Member "My Tickets" tab | **Still shown** — member can view past attendance history |
| Member Dashboard "Events For You" | Archived events **hidden** |
| Organizer EventsList | Two tabs: **Upcoming** (default, active events) and **Past** (archived) |
| Admin Events page | Shows all events; existing status filter covers past events |

### Implementation

**No DB migration needed.** Filtering is done at render time using a pure utility function.

**`apps/member/src/lib/dates.ts`** — add:
```ts
export function isEventArchived(event: Event, now = new Date()): boolean {
  const cutoff = event.end_date ?? event.event_date
  return cutoff ? new Date(cutoff) < now : false
}
```

**`apps/member/src/pages/events/EventsList.tsx`**
- Discover tab: apply `!isEventArchived(e)` filter to `filteredEvents`
- My Tickets tab: no change (show all, including past)

**`apps/member/src/pages/dashboard/Dashboard.tsx`**
- Existing `status === 'upcoming'` filter augmented with `!isEventArchived(e)`

**`apps/member/src/pages/organizer/events/OrgEventsList.tsx`** (or equivalent)
- Add "Upcoming" / "Past" tab toggle
- "Upcoming" tab: `!isEventArchived(e)`
- "Past" tab: `isEventArchived(e)`

### Edge Cases
- Events with no `end_date` AND no `event_date`: treated as active (never archived)
- Events created in the past with no dates: same — never archived unless a date is set

---

## Feature 2: Cancel Registration

### Rules
- Cancellable when `registration.status` is `pending` or `approved`
- **Not cancellable** if `checked_in === true` (member has already attended)
- On cancel: `status` set to `'cancelled'`, `qr_code_token` cleared to `null`
- Cancelled registrations are **excluded** from:
  - Member My Tickets tab
  - Organizer registrants list

### DB Migration

Add `'cancelled'` to the `event_registrations.status` CHECK constraint:

```sql
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
```

### Store — `useEventsStore`

Add `cancelRegistration(regId: string): Promise<void>`:
```ts
cancelRegistration: async (regId) => {
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled', qr_code_token: null })
    .eq('id', regId)
  if (error) throw error
  set((s) => ({
    registrations: s.registrations.map((r) =>
      r.id === regId ? { ...r, status: 'cancelled' as const, qr_code_token: null } : r
    ),
  }))
},
```

### UX Flow — Double Confirmation

Implemented as two sequential bottom sheets (using a `cancelStep` state: `null | 'first' | 'second'`).

**Step 1 sheet** (appears on "Cancel Registration" tap):
> **Cancel your registration?**
> You'll lose your spot for *[Event Title]*. This cannot be undone.
>
> [Keep my spot] [Yes, continue →]

**Step 2 sheet** (appears after "Yes, continue"):
> **Are you absolutely sure?**
> You will be permanently removed from the attendee list.
>
> [Go back] [Cancel Registration] ← red destructive button

**On final confirm:**
1. Call `cancelRegistration(reg.id)`
2. Navigate back to `/events`

### UI Placement

`EventTicket.tsx` — Add at the bottom of the ticket card (below the info rows), only rendered when `!checkedIn`:
```tsx
{!checkedIn && (
  <button onClick={() => setCancelStep('first')} className="...text-red...">
    Cancel Registration
  </button>
)}
```

---

## Feature 3: Manual Check-in (Organizer)

### Server — SQL RPC

New `manual_checkin` PostgreSQL function, `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION manual_checkin(
  p_registration_id uuid,
  p_organizer_id    uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg     event_registrations%ROWTYPE;
  v_event   events%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_reg FROM event_registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'registration_not_found');
  END IF;
  IF v_reg.status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'not_approved');
  END IF;
  IF v_reg.checked_in IS TRUE THEN
    RETURN json_build_object('success', false, 'error', 'already_checked_in');
  END IF;

  SELECT * INTO v_event   FROM events   WHERE id = v_reg.event_id;
  SELECT * INTO v_profile FROM profiles WHERE id = v_reg.user_id;

  UPDATE event_registrations SET checked_in = true WHERE id = p_registration_id;

  INSERT INTO point_transactions (user_id, amount, description, source)
  VALUES (v_reg.user_id, v_event.points_value, 'Attended: ' || v_event.title, 'event_attendance');

  UPDATE profiles
  SET total_points = total_points + v_event.points_value
  WHERE id = v_reg.user_id;

  RETURN json_build_object(
    'success',       true,
    'member_name',   v_profile.full_name,
    'points_awarded', v_event.points_value
  );
END;
$$;
```

### ApprovalCard Component

**`Registration` interface** gains:
```ts
checked_in?: boolean
```

**New prop:**
```ts
onCheckIn?: (id: string) => void
```

**UI logic for `status === 'approved'`:**
- If `!checked_in`: show **"Check In"** button (green, `UserCheck` icon)
- If `checked_in`: show a green **"Checked In ✓"** pill (no action button)

### EventRegistrants Page

1. Query gains `checked_in` column: `.select('id, status, registered_at, checked_in, profiles(...)')`
2. Map `row.checked_in` into the `Registration` object
3. New `handleCheckIn` handler:
```ts
const handleCheckIn = async (regId: string) => {
  const result = await supabase.rpc('manual_checkin', {
    p_registration_id: regId,
    p_organizer_id:    organizerUser.id,
  })
  if (result.data?.success) {
    setRegistrants((prev) =>
      prev.map((r) => r.id === regId ? { ...r, checked_in: true } : r)
    )
    // toast: "✓ {member_name} checked in — +{points_awarded} pts"
  }
}
```
4. Pass `onCheckIn={handleCheckIn}` to `<ApprovalCard />`

### Realtime on Member Side

No changes needed. The existing `postgres_changes` subscription in `EventTicket.tsx` already watches for `checked_in` flipping to `true` — manual check-in triggers the same success animation automatically.

---

## Files Changed Summary

| File | Change |
|---|---|
| `apps/member/src/lib/dates.ts` | Add `isEventArchived()` |
| `apps/member/src/pages/events/EventsList.tsx` | Filter Discover by `!isEventArchived` |
| `apps/member/src/pages/dashboard/Dashboard.tsx` | Augment events filter with `!isEventArchived` |
| `apps/member/src/pages/organizer/events/OrgEventsList.tsx` | Add Upcoming/Past tabs |
| `apps/member/src/pages/events/EventTicket.tsx` | Add cancel button + double-confirm sheets |
| `apps/member/src/stores/useEventsStore.ts` | Add `cancelRegistration` action |
| `apps/member/src/components/ApprovalCard.tsx` | Add `checked_in` + `onCheckIn` prop |
| `apps/member/src/pages/organizer/events/EventRegistrants.tsx` | Add `handleCheckIn`, fetch `checked_in` |
| DB migration | Add `'cancelled'` to status CHECK + `manual_checkin` RPC |

---

## Out of Scope

- Refund of points on cancellation (points are only awarded at check-in, not before)
- Re-registration after cancellation (member can simply register again)
- Push notifications on cancellation
- Admin-initiated cancellation (admin can delete the event entirely)
