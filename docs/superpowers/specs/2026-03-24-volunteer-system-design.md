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
  applied_at          timestamptz
  reviewed_at         timestamptz | null
  reviewed_by         uuid | null → profiles
```

### New Store: `useOrgVolunteerStore.ts`
Location: `apps/member/src/stores/useOrgVolunteerStore.ts`

**State:**
```ts
applications: OrgVolunteerApplication[]  // joined: profiles + events
loading: boolean
error: string | null
```

**Actions:**
- `loadApplications(chapterId: string)` — fetches all volunteer_applications for events belonging to the given chapter, joining profiles (full_name, email, school_or_company) and events (title)
- `approveApplication(id: string, reviewerId: string)` — sets status='approved', reviewed_at=now(), reviewed_by=reviewerId
- `rejectApplication(id: string, reviewerId: string)` — sets status='rejected', reviewed_at=now(), reviewed_by=reviewerId
- `revertApplication(id: string)` — resets status='pending', clears reviewed_at + reviewed_by

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
  applied_at: string
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
- Reason text — truncated to 2 lines with expand on tap
- Optional chips: phone number, social handle (only rendered if present)
- Action buttons: Approve (green) / Reject (red) / Revert (slate, shown when status ≠ pending)
- `StatusBadge` for approved/rejected states

### Modified: `OrgDashboard.tsx`
- `TabId`: `'approvals' | 'events'` → `'approvals' | 'volunteers'`
- Replace Events tab button with Volunteers (label: `Volunteers(N)` when pending > 0)
- Volunteers tab content: loading skeleton → empty state → staggered list of `VolunteerApprovalCard`
- Empty state copy: "No volunteer applications yet."
- Stats bar: "Pending" = pending event registrations + pending volunteer applications (sum)

---

## Files Changed

| File | Action |
|------|--------|
| `apps/member/src/stores/useOrgVolunteerStore.ts` | Create |
| `apps/member/src/components/VolunteerApprovalCard.tsx` | Create |
| `apps/member/src/pages/organizer/Dashboard.tsx` | Modify |

---

## Files Untouched

| File | Reason |
|------|--------|
| `apps/member/src/stores/useVolunteerStore.ts` | Member-only, complete |
| `apps/member/src/pages/events/EventVolunteer.tsx` | Member form, complete |
| All organizer/events/* pages | No changes needed |

---

## Error Handling

- All Supabase calls: loading + error + empty state required
- Optimistic UI: update local state immediately on approve/reject, revert on Supabase error
- TypeScript strict mode: no `any`, all shapes fully typed

---

## Testing Checklist

- [ ] Volunteer tab visible on organizer dashboard
- [ ] Pending volunteer applications appear as cards
- [ ] Approve sets status=approved, card updates
- [ ] Reject sets status=rejected, card updates
- [ ] Revert resets to pending
- [ ] Empty state shows when no applications
- [ ] Stats "Pending" reflects combined count
- [ ] Member-side application flow unaffected
