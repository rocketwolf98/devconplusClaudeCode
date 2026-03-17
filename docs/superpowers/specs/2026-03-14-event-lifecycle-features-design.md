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
Events with neither field set are never archived.

### Behaviour by Surface

| Surface | Behaviour |
|---|---|
| Member Discover tab (EventsList) | Archived events **hidden** |
| Member "My Tickets" tab | **Still shown** — members can see past attendance history |
| Member Dashboard "Events For You" | Archived events **hidden** |
| Organizer EventsList | Two tabs: **Upcoming** (default, active) and **Past** (archived) |
| Admin Events page | Shows all; existing status filter covers past events |

### Implementation

**No DB migration needed.** Filtering is done at render time via a pure utility.

**`apps/member/src/lib/dates.ts`** — add:
```ts
export function isEventArchived(event: Event, now = new Date()): boolean {
  const cutoff = event.end_date ?? event.event_date
  return cutoff ? new Date(cutoff) < now : false
}
```

**`apps/member/src/pages/events/EventsList.tsx`**
- Discover tab: apply `!isEventArchived(e)` filter before displaying events
- My Tickets tab: no change (show all registrations, including past events)

**`apps/member/src/pages/dashboard/Dashboard.tsx`**
- Augment the existing `status === 'upcoming'` filter with `&& !isEventArchived(e)`

**`apps/member/src/pages/organizer/events/EventsList.tsx`** (component: `OrgEventsList`)
- Add local state: `activeTab: 'upcoming' | 'past'`
- Add tab UI (pill tabs, matching existing design system)
- "Upcoming" tab: render events where `!isEventArchived(e)`
- "Past" tab: render events where `isEventArchived(e)`
- This is a new UI section, not just a one-liner filter

---

## Feature 2: Cancel Registration

### Rules
- Cancellable when `status` is `pending` or `approved`
- **Not cancellable** if `reg.checked_in === true`
  - The cancel button visibility on `EventTicket` must read from **`reg.checked_in`** (the value in the store / fetched from DB), **not** from the local `checkedIn` state variable (which starts `false` and catches up via Realtime). This prevents a brief window where a checked-in member could see the cancel button.
- On cancel: `status = 'cancelled'`, `qr_code_token = null`
- Cancelled registrations excluded from: member My Tickets tab, organizer registrants list

### Type Changes

**`packages/supabase/src/types.ts`** — update `RegistrationStatus`:
```ts
// Before
export type RegistrationStatus = 'pending' | 'approved' | 'rejected'

// After
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
```

This is required so that cancelled rows returned from Supabase don't cause TypeScript errors in `ApprovalCard`, `EventRegistrants`, and the store.

### DB Migration

```sql
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
```

### Store — `useEventsStore`

**Update `EventsState` interface** to include the new action:
```ts
interface EventsState {
  // ...existing actions...
  cancelRegistration: (regId: string) => Promise<void>
}
```

**Implementation** (consistent with all other store actions — throw on error):
```ts
cancelRegistration: async (regId) => {
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled', qr_code_token: null })
    .eq('id', regId)
  if (error) throw error   // caller (cancel sheet) catches and shows error state
  set((s) => ({
    registrations: s.registrations.map((r) =>
      r.id === regId
        ? { ...r, status: 'cancelled' as const, qr_code_token: null }
        : r
    ),
  }))
},
```

### Orphaned Pending Subscription

If a member is on the `EventPending` screen in one tab and cancels their registration in another, the `subscribeToRegistration` Realtime channel remains open. On cancellation, the store update will change `reg.status` to `'cancelled'`. `EventPending` already reads `reg` from the store — detecting `reg.status === 'cancelled'` should navigate the user away (e.g., back to `/events`). Add this check in `EventPending`'s `useEffect`.

### UX Flow — Double Confirmation

State: `cancelStep: null | 'first' | 'second'` (local to `EventTicket`)

**Step 1 sheet** (triggered by "Cancel Registration" tap):
> **Cancel your registration?**
> You'll lose your spot for *[event.title]*. This cannot be undone.
>
> `[Keep my spot]` &nbsp;&nbsp; `[Yes, continue →]`

**Step 2 sheet** (after "Yes, continue"):
> **Are you absolutely sure?**
> You will be permanently removed from the attendee list.
>
> `[Go back]` &nbsp;&nbsp; `[Cancel Registration]` ← red destructive button

**On final confirm:**
1. Call `cancelRegistration(reg.id)` — if it throws, show an inline error inside the sheet
2. Navigate to `/events`

### UI Placement

`EventTicket.tsx` — rendered below the info rows, only when `!reg.checked_in` (store value):
```tsx
{!reg.checked_in && (
  <button onClick={() => setCancelStep('first')} className="...text-red...">
    Cancel Registration
  </button>
)}
```

---

## Feature 3: Manual Check-in (Organizer)

### Server — SQL RPC

New `manual_checkin` function, `SECURITY DEFINER`. Includes idempotency, status validation, and role check:

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
  -- Idempotency guard — no double points
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

### ApprovalCard Component

**`Registration` interface** (in `ApprovalCard.tsx`) gains:
```ts
export interface Registration {
  id: string
  member_name: string
  member_email: string
  school_or_company: string
  event_title: string
  registered_at: string
  status: 'pending' | 'approved' | 'rejected'  // 'cancelled' filtered out before reaching this component
  checked_in?: boolean                           // new
}
```

Note: `'cancelled'` is intentionally excluded from the local `Registration.status` type — the organizer registrants query already excludes cancelled rows, so this type correctly reflects what the component receives.

**New prop on `ApprovalCardProps`:**
```ts
onCheckIn?: (id: string) => void
```

**UI logic for `status === 'approved'`:**
```tsx
{registration.status === 'approved' && !registration.checked_in && (
  <button onClick={() => onCheckIn?.(registration.id)} className="...bg-green...">
    <UserCheck className="w-3.5 h-3.5" />
    Check In
  </button>
)}
{registration.status === 'approved' && registration.checked_in && (
  <p className="text-xs text-green font-semibold flex items-center gap-1">
    <CheckCircle2 className="w-3.5 h-3.5" />
    Checked In
  </p>
)}
```

### EventRegistrants Page

1. **Query update** — add `checked_in` to select:
   ```ts
   .select('id, status, registered_at, checked_in, profiles(full_name, email, school_or_company)')
   ```

2. **Mapping update** — include `checked_in` in the mapped `Registration` object:
   ```ts
   checked_in: row.checked_in ?? false,
   ```

3. **Filter** — exclude cancelled registrations from the list:
   ```ts
   .neq('status', 'cancelled')
   ```

4. **`handleCheckIn` handler:**
   ```ts
   const handleCheckIn = async (regId: string) => {
     const { data, error } = await supabase.rpc('manual_checkin', {
       p_registration_id: regId,
       p_organizer_id:    organizerUser.id,
     })
     if (error || !data?.success) return  // silent fail; could add toast
     setRegistrants((prev) =>
       prev.map((r) => r.id === regId ? { ...r, checked_in: true } : r)
     )
     // toast: `✓ ${data.member_name} checked in — +${data.points_awarded} pts`
   }
   ```

5. Pass `onCheckIn={handleCheckIn}` to `<ApprovalCard />`.

### Realtime on Member Side

No changes needed. The existing `postgres_changes` subscription in `EventTicket.tsx` already watches for `checked_in` flipping to `true` — manual check-in triggers the same success animation automatically.

---

## Files Changed Summary

| File | Change |
|---|---|
| `packages/supabase/src/types.ts` | Add `'cancelled'` to `RegistrationStatus` union |
| `apps/member/src/lib/dates.ts` | Add `isEventArchived()` |
| `apps/member/src/pages/events/EventsList.tsx` | Filter Discover by `!isEventArchived`; filter My Tickets to exclude cancelled |
| `apps/member/src/pages/dashboard/Dashboard.tsx` | Augment events filter with `!isEventArchived` |
| `apps/member/src/pages/organizer/events/EventsList.tsx` | Add Upcoming/Past tab state + tab UI |
| `apps/member/src/pages/events/EventTicket.tsx` | Add cancel button (reads `reg.checked_in`) + double-confirm sheets |
| `apps/member/src/pages/events/EventPending.tsx` | Navigate away if `reg.status === 'cancelled'` |
| `apps/member/src/stores/useEventsStore.ts` | Add `cancelRegistration` to interface + implementation |
| `apps/member/src/components/ApprovalCard.tsx` | Add `checked_in` field + `onCheckIn` prop |
| `apps/member/src/pages/organizer/events/EventRegistrants.tsx` | Add `handleCheckIn`, fetch `checked_in`, exclude cancelled |
| DB migration | `'cancelled'` to status CHECK + `manual_checkin` RPC |

---

## Out of Scope

- Refund of points on cancellation (points only awarded at check-in)
- Re-registration after cancellation (member can simply register again if the event allows)
- Push notifications on cancellation
- Admin-initiated cancellation
