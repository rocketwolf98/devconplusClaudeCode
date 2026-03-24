# Volunteer System — Organizer ↔ Member Wire-Up
**Date:** 2026-03-24
**Branch:** feat/volunteer-system
**Status:** Approved

---

## Overview

Wire the existing member-side volunteer application flow into the organizer dashboard. Members already apply via `/events/:id/volunteer`. Organizers currently have no way to see or action those applications. This spec covers adding a **Volunteers tab** to the Organizer Dashboard that lets chapter officers approve or reject volunteer applications — replacing the redundant Events tab (Events is already accessible via the sidebar nav).

---

## Scope

### In scope
- New `Volunteers` tab on the Organizer Dashboard (`/organizer`) replacing the `Events` tab
- New `VolunteerApprovalCard` component for displaying and actioning applications
- New `useOrgVolunteerStore` for fetching/mutating volunteer applications on the organizer side
- Stats bar "Pending" count updated to reflect combined pending event registrations + volunteer applications
- RLS policy allowing chapter officers to SELECT volunteer_applications for their chapter's events

### Out of scope
- Member-side volunteer form (`EventVolunteer.tsx`) — already complete, no changes
- Member-side `useVolunteerStore` — already complete, no changes
- New routes — no new pages needed
- Points award on volunteer approval — handled separately by Edge Function (future)

---

## Data Layer

### DB Table (already exists)
```
volunteer_applications
  id                  uuid PK
  event_id            uuid → events
  user_id             uuid → profiles
  reason              text
  phone_number        text | null
  social_media_handle text | null
  status              text  CHECK IN ('pending','approved','rejected')
  applied_at          timestamptz  (NOT NULL)
  reviewed_at         timestamptz | null
  reviewed_by         uuid | null → profiles
```

### RLS Policy (must be added as part of this work)
```sql
-- Officers can read volunteer applications for their chapter's events
CREATE POLICY "Officers read chapter volunteer apps" ON volunteer_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = volunteer_applications.event_id
        AND e.chapter_id = p.chapter_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );

-- Officers can update (approve/reject) volunteer applications for their chapter's events
CREATE POLICY "Officers update chapter volunteer apps" ON volunteer_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = volunteer_applications.event_id
        AND e.chapter_id = p.chapter_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );
```

### New Store: `useOrgVolunteerStore.ts`
Location: `apps/member/src/stores/useOrgVolunteerStore.ts`

**State:**
```ts
applications: OrgVolunteerApplication[]  // all statuses, joined: profiles + events
loading: boolean
error: string | null
```

**Actions:**

- `loadApplications(chapterId: string)` — fetches ALL `volunteer_applications` (all statuses) for events belonging to the given chapter, joining `profiles` (full_name, email, school_or_company) and `events` (title). Stores all statuses so the UI can render approved/rejected cards too. `pending` count is derived by filtering in the component.

- `approveApplication(id: string)` — reads `reviewerId` internally via `useAuthStore.getState().user?.id`. Sets `status='approved'`, `reviewed_at=now()`, `reviewed_by=reviewerId`. Mutates local state **on success** (non-optimistic, consistent with existing Dashboard pattern).

- `rejectApplication(id: string)` — same internal reviewer pattern. Sets `status='rejected'`, `reviewed_at=now()`, `reviewed_by=reviewerId`. Mutates local state on success.

- `revertApplication(id: string)` — resets `status='pending'`, `reviewed_at=null`, `reviewed_by=null`. Mutates local state on success.

> Note: All three mutation actions follow the non-optimistic pattern from `Dashboard.tsx` — local state is only updated after a confirmed Supabase success. On error, `error` state is set and local state is not changed.

**Joined shape (`OrgVolunteerApplication`):**
```ts
{
  id: string
  event_id: string
  event_title: string
  user_id: string
  member_name: string
  member_email: string
  school_or_company: string
  reason: string
  phone_number: string | null
  social_media_handle: string | null
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string | null     // null-guarded in card display
  reviewed_at: string | null
  reviewed_by: string | null
}
```

---

## UI Components

### New: `VolunteerApprovalCard`
Location: `apps/member/src/components/VolunteerApprovalCard.tsx`

Mirrors `ApprovalCard` layout:
- Avatar initials circle (slate-100 bg)
- Member name + school/company
- Event title (small, muted)
- **"Applied {date}"** label (consistent semantic with `ApprovalCard`'s "Registered {date}"; null-guarded: shows "Applied —" if `applied_at` is null)
- Reason text — truncated to 2 lines (`line-clamp-2`) with expand/collapse toggle on tap
- Optional chips: phone number, social handle (only rendered if value is non-null and non-empty)
- Action buttons:
  - When `status === 'pending'`: Approve (green) + Reject (red)
  - When `status === 'approved'` or `status === 'rejected'`: Revert (slate) button
  - (Unlike event registrations, no QR token is generated on volunteer approval, so reverting an approved application is safe and both states are revertable)
- `StatusBadge` showing current status for approved/rejected states

### Modified: `OrgDashboard.tsx`

**Tab changes:**
- `TabId`: `'approvals' | 'events'` → `'approvals' | 'volunteers'`
- Replace Events tab button with `Volunteers` tab
- Volunteers tab label badge: shows pending volunteer application count only (e.g., `Volunteers (2)`), mirroring how the Approvals tab badge shows only its own pending count (`Approvals (3)`). The two tab badges are independent; the combined total is surfaced only in the stats bar.

**Stats bar "Pending" count:**
- = pending event registrations + pending volunteer applications (sum of both)
- Requires `useOrgVolunteerStore` loaded alongside the existing registration fetch

**Volunteers tab content states:**
1. Loading: pulse skeleton (same pattern as Approvals skeleton)
2. Empty: card with Heart icon + "No volunteer applications yet." (green-toned icon, consistent with Approvals empty state)
3. List: staggered `VolunteerApprovalCard` list (all statuses shown, same as Approvals showing all registration statuses)

---

## Files Changed

| File | Action |
|------|--------|
| `apps/member/src/stores/useOrgVolunteerStore.ts` | Create |
| `apps/member/src/components/VolunteerApprovalCard.tsx` | Create |
| `apps/member/src/pages/organizer/Dashboard.tsx` | Modify |
| Supabase migration: `20260324_volunteer_rls.sql` | Create (RLS policies) |

## Files Untouched

| File | Reason |
|------|--------|
| `apps/member/src/stores/useVolunteerStore.ts` | Member-only, complete |
| `apps/member/src/pages/events/EventVolunteer.tsx` | Member form, complete |
| All organizer/events/* pages | No changes needed |

---

## Error Handling

- All Supabase calls: loading + error + empty state required
- Mutations: non-optimistic — mutate local state on success only; set `error` on failure
- TypeScript strict mode: no `any`, all shapes fully typed
- `applied_at` null-guarded in card display

---

## Testing Checklist

- [ ] Volunteers tab visible on organizer dashboard (Events tab gone)
- [ ] Pending volunteer applications appear as cards
- [ ] Approve sets status=approved, card updates (Revert button appears)
- [ ] Reject sets status=rejected, card updates (Revert button appears)
- [ ] Revert resets to pending, clears reviewed_at + reviewed_by
- [ ] Empty state shows when no applications
- [ ] Stats "Pending" reflects combined event registrations + volunteer applications count
- [ ] Volunteers tab badge reflects only volunteer pending count
- [ ] Approvals tab badge reflects only registration pending count
- [ ] applied_at null renders "Applied —" without crash
- [ ] Member-side application flow unaffected
- [ ] RLS: officer can read/update their chapter's applications; cannot read other chapters'
