# Past Event Summary — Design Spec
> Date: 2026-03-17
> Feature: Post-event read-only summary page for organizers
> Branch: feat/sprint2-qa-feedback

---

## Overview

When an event's end time has passed (`isEventArchived()` returns true), organizers should no longer be able to manage registrations. Instead, tapping a past event opens a dedicated **Post-Event Summary** page that surfaces a registration funnel and a read-only attendee list.

---

## Requirements

1. Past events appear in the existing "Past" tab of `OrgEventsList`.
2. Tapping a past event navigates to `/organizer/events/:id/summary` (not the regular detail page).
3. The summary page is **read-only** — no approve, reject, revert, or check-in actions.
4. The page shows a **registration funnel** with 5 stats: Total Registered, Checked In, Approved, Pending, Rejected.
5. Below the funnel, a **scrollable attendee list** filtered by All / Approved / Pending / Rejected.
6. Organizers can still **delete** a past event via the same 2-step confirm sheet.
7. The "Send Announcement" button is **not shown** on past events.
8. Upcoming events use `OrgEventDetail` unchanged.

---

## Routing

**New route** added to `apps/member/src/router.tsx`:
```
/organizer/events/:id/summary  →  OrgEventSummary
```

**`OrgEventsList` navigation change:**
```ts
onClick={() => navigate(
  isEventArchived(event)
    ? `/organizer/events/${event.id}/summary`
    : `/organizer/events/${event.id}`
)}
```

Past event cards in the list get a subtle `Archive` icon badge (top-right) to visually signal read-only state.

---

## `OrgEventSummary` Page (`apps/member/src/pages/organizer/events/EventSummary.tsx`)

### Header (sticky, `bg-blue`, rounded-b-3xl)
- Back arrow → `navigate(-1)`
- Trash icon → opens 2-step delete confirm sheet (same as `OrgEventDetail`)
- Title: `event.title`
- Subtitle: `"Post-Event Summary • {formatDate.full(event.event_date)}"`

### Funnel Stats Grid
2-column top row + 3-column bottom row:
```
[ Total Registered ]  [ Checked In ]
  [ Approved ]  [ Pending ]  [ Rejected ]
```

| Stat | Color |
|------|-------|
| Total Registered | `text-blue` |
| Checked In | `text-green` |
| Approved | `text-blue` (lighter) |
| Pending | `text-yellow-500` |
| Rejected | `text-red` |

Data fetched from `event_registrations` joined with `profiles` (same query as `OrgEventRegistrants`).

### Read-only Attendee List
- Filter tabs: All / Approved / Pending / Rejected (with counts)
- Uses existing `<ApprovalCard readOnly />` — action buttons hidden when `readOnly={true}`
- Loading skeleton: same 3-card pulse pattern as `OrgEventRegistrants`
- Empty state: `<ClipboardList />` icon, "No registrants found."

### Delete Sheet
- Identical 2-step confirm bottom sheet from `OrgEventDetail`
- On confirm: `deleteEvent(event.id)` → navigate to `/organizer/events`

---

## `ApprovalCard` Change

Add optional `readOnly` prop:

```ts
interface ApprovalCardProps {
  registration: Registration
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRevert?: (id: string) => void
  onCheckIn?: (id: string) => void
  readOnly?: boolean   // ← new
}
```

When `readOnly={true}`:
- Action buttons (Approve, Reject, Revert, Check In) are not rendered.
- `whileTap` press feedback removed from the card root.
- All other content (name, email, school, status badge, registered date) unchanged.

---

## Mock Data

Add one past event to `packages/supabase/src/mock/events.ts` with `end_date` before 2026-03-17 so the "Past" tab and summary page are testable during development:

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
}
```

---

## Files Affected

| File | Change |
|------|--------|
| `apps/member/src/router.tsx` | Add `/organizer/events/:id/summary` route |
| `apps/member/src/pages/organizer/events/EventsList.tsx` | Navigate past events to `.../summary`; add Archive badge to past cards |
| `apps/member/src/pages/organizer/events/EventSummary.tsx` | **New file** — post-event summary page |
| `apps/member/src/components/ApprovalCard.tsx` | Add `readOnly?: boolean` prop |
| `packages/supabase/src/mock/events.ts` | Add one past mock event |

**Unchanged:**
- `OrgEventDetail.tsx`
- `OrgEventRegistrants.tsx`
- `useEventsStore.ts`

---

## Out of Scope

- Export to CSV / download attendee list
- Charts or visualizations beyond the 5 stat cards
- Editing any field on a past event
- Re-opening / un-archiving a past event
