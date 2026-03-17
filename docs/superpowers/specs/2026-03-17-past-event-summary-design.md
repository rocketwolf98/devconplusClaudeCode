# Past Event Summary — Design Spec
> Date: 2026-03-17
> Feature: Post-event read-only summary page for organizers
> Branch: feat/sprint2-qa-feedback

---

## Overview

When an event's end time has passed (`isEventArchived()` returns true), organizers should no longer be able to manage registrations. Instead, tapping a past event opens a dedicated **Post-Event Summary** page that surfaces a registration funnel and a read-only attendee list.

`isEventArchived()` compares `event.end_date ?? event.event_date` against `new Date()` — it does **not** check `event.status`. The "Past" tab in `OrgEventsList` already uses this function for filtering.

---

## Requirements

1. Past events appear in the existing "Past" tab of `OrgEventsList`.
2. Tapping a past event navigates to `/organizer/events/:id/summary` (not the regular detail page).
3. The summary page is **read-only** — no approve, reject, revert, or check-in actions.
4. The page shows a **registration funnel** with 5 stats: Total Registered, Checked In, Approved, Pending, Rejected.
5. Below the funnel, a **scrollable attendee list** filtered by All / Approved / Pending / Rejected. There is no "Checked In" filter tab — Checked In is a stat only (MVP scope).
6. Organizers can still **delete** a past event via the same 2-step confirm sheet.
7. The "Send Announcement" button is **not shown** on past events.
8. Upcoming events use `OrgEventDetail` unchanged.

---

## Routing

**New route** added to `apps/member/src/router.tsx`, placed alongside `/organizer/events/:id/registrants`:
```
/organizer/events/:id/summary  →  OrgEventSummary
```

`OrgEventSummary` is imported as an **eager named export** (same pattern as all other organizer pages in `router.tsx`):
```ts
import { OrgEventSummary } from './pages/organizer/events/EventSummary'
```

Route placement order in `router.tsx` (to avoid path conflict with `/organizer/events/create`):
```
/organizer/events/create
/organizer/events/:id
/organizer/events/:id/registrants
/organizer/events/:id/summary     ← new
```

**`OrgEventsList` navigation change:**
```ts
onClick={() => navigate(
  isEventArchived(event)
    ? `/organizer/events/${event.id}/summary`
    : `/organizer/events/${event.id}`
)}
```

Past event cards in the list get a subtle `Archive` icon badge (top-right corner) to visually signal read-only state.

---

## `OrgEventSummary` Page (`apps/member/src/pages/organizer/events/EventSummary.tsx`)

### Loading & Not-Found States

On mount:
- If `events` store is empty, call `fetchEvents()` (same guard as `OrgEventDetail`: `if (events.length === 0) void fetchEvents()`).
- If event is not found after fetch, render the same fallback as `OrgEventDetail`:
  ```tsx
  <div className="p-6 text-center">
    <p className="text-slate-400">Event not found.</p>
  </div>
  ```
- The registrant list has its own `isLoading` state (same skeleton as `OrgEventRegistrants`).

### Header (sticky, `bg-blue`, `rounded-b-3xl`)
- Back arrow → `navigate(-1)`
- Trash icon → opens 2-step delete confirm sheet (same as `OrgEventDetail`)
- Title: `event.title`
- Subtitle: `"Post-Event Summary • {formatDate.full(event.event_date)}"` using `formatDate.full()` from `lib/dates.ts`

### Funnel Stats Grid

Two nested rows inside a `space-y-3` wrapper:
- **Row 1:** `grid grid-cols-2 gap-3` — Total Registered, Checked In
- **Row 2:** `grid grid-cols-3 gap-3` — Approved, Pending, Rejected

```
[ Total Registered ]  [ Checked In ]
[ Approved ] [ Pending ] [ Rejected ]
```

| Stat | Color | Computed as |
|------|-------|-------------|
| Total Registered | `text-blue` | `registrants.length` |
| Checked In | `text-green` | `registrants.filter(r => r.checked_in).length` |
| Approved | `text-blue/70` | `registrants.filter(r => r.status === 'approved').length` |
| Pending | `text-yellow-500` | `registrants.filter(r => r.status === 'pending').length` |
| Rejected | `text-red` | `registrants.filter(r => r.status === 'rejected').length` |

Note: Checked In is derived separately — it is **not** part of the `counts` object used for the filter tabs.

Data fetched from `event_registrations` joined with `profiles` (same Supabase query as `OrgEventRegistrants`).

### Read-only Attendee List
- Filter tabs: All / Approved / Pending / Rejected (with counts)
- No "Checked In" filter tab — intentionally omitted for MVP
- Uses existing `<ApprovalCard readOnly />` — action buttons hidden when `readOnly={true}`
- Loading skeleton: same 3-card pulse pattern as `OrgEventRegistrants`
- Empty state: `<ClipboardList />` icon, "No registrants found."

### Delete Sheet
- Identical 2-step confirm bottom sheet from `OrgEventDetail`
- On confirm: `deleteEvent(event.id)` → navigate to `/organizer/events`

---

## `ApprovalCard` Change

All handler props become optional (safe — existing caller `OrgEventRegistrants` still passes all of them). Add `readOnly`:

```ts
interface ApprovalCardProps {
  registration: Registration
  onApprove?: (id: string) => void   // was required — now optional
  onReject?: (id: string) => void    // was required — now optional
  onRevert?: (id: string) => void    // was required — now optional
  onCheckIn?: (id: string) => void   // already optional
  readOnly?: boolean                 // ← new
}
```

When `readOnly={true}`:
- Action buttons (Approve, Reject, Revert, Check In) are not rendered.
- `whileTap` press feedback removed from the card root.
- All other content (name, email, school, status badge, registered date) unchanged.

Making handlers optional is backward-compatible — `OrgEventRegistrants` already passes all four, so TypeScript will not flag it.

---

## Mock Data

`ev-1` (`DEVCON Summit 2026`) has `end_date: '2026-03-15T18:00:00Z'`, which is before 2026-03-17, so it already appears in the Past tab. However, `ev-1` still carries `status: 'upcoming'`, which causes `OrgEventsList` to render an incorrect "pending" `StatusBadge` on a past card. Update `ev-1.status` to `'past'` in the same commit.

Add `ev-past-1` as a second past event so that the summary page has a dedicated fixture with a distinct title:

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
| `apps/member/src/router.tsx` | Add `/organizer/events/:id/summary` route + eager import of `OrgEventSummary` |
| `apps/member/src/pages/organizer/events/EventsList.tsx` | Navigate past events to `.../summary`; add `Archive` badge to past event cards |
| `apps/member/src/pages/organizer/events/EventSummary.tsx` | **New file** — post-event summary page |
| `apps/member/src/components/ApprovalCard.tsx` | Make `onApprove/onReject/onRevert` optional; add `readOnly?: boolean` prop |
| `packages/supabase/src/mock/events.ts` | Add `ev-past-1` mock event; update `ev-1.status` to `'past'` |

**Unchanged:**
- `OrgEventDetail.tsx`
- `OrgEventRegistrants.tsx`
- `useEventsStore.ts`

---

## Out of Scope

- Export to CSV / download attendee list
- Charts or visualizations beyond the 5 stat cards
- "Checked In" filter tab in the attendee list
- Editing any field on a past event
- Re-opening / un-archiving a past event
