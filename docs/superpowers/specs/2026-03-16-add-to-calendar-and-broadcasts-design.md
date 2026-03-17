# Design Spec: Add to Calendar + Event Broadcasts
**Date:** 2026-03-16
**Branch:** feat/sprint2-qa-feedback
**Status:** Approved for implementation

---

## Overview

Two features added to the DEVCON+ member app:

1. **Add to Calendar** — a one-tap shortcut on the EventTicket screen that exports the event to Google Calendar or downloads an iCal file.
2. **Event Broadcasts** — organizers send plain-text announcements scoped to a specific event; approved registrants receive them as in-app Realtime notifications.

---

## Feature 1: Add to Calendar

### Scope
Frontend-only. No backend changes. No OAuth or API key required.

### Placement
A ghost button sits **below the ticket card**, on the gradient background:

```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  onClick={() => setShowCalSheet(true)}
  className="w-full max-w-sm flex items-center justify-center gap-2
             bg-white/18 border border-white/30 text-white
             rounded-2xl py-3 text-sm font-semibold backdrop-blur-sm"
>
  <CalendarPlus className="w-4 h-4" />
  Add to Calendar
</motion.button>
```

Hidden entirely when `event.event_date` is null or the event status is `'past'`.

### Bottom Sheet pattern
Uses the existing hand-rolled `framer-motion` bottom sheet pattern from `EventTicket.tsx` (cancel flow) — fixed backdrop `AnimatePresence` + `motion.div` sliding from the bottom with `type: 'spring', stiffness: 300, damping: 30`.

### Interaction: `<AddToCalendarSheet />`

Props: `{ event: Event; isOpen: boolean; onClose: () => void }`

Two tappable options inside the sheet:

**1 — Google Calendar**
Constructs and opens this URL in a new tab:
```
https://calendar.google.com/calendar/render
  ?action=TEMPLATE
  &text={encodeURIComponent(event.title)}
  &dates={startUTC}/{endUTC}          // format: YYYYMMDDTHHmmssZ
  &details={encodeURIComponent(event.description ?? '')}
  &location={encodeURIComponent(event.location ?? '')}
  &ctz=Asia/Manila
```
`startUTC` = `event.event_date` reformatted as `YYYYMMDDTHHmmss` + `Z`.
`endUTC` = start + 2 hours (no end time stored in DB; 2h is the default).

**2 — iCal / Other Calendars**
Generates an RFC 5545 `.ics` string as a Blob and triggers a download via a temporary `<a>` element.

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DEVCON+//Events//EN
BEGIN:VEVENT
UID:{event.id}@devconplus
DTSTART;TZID=Asia/Manila:{startLocal}   // YYYYMMDDTHHmmss in UTC+8
DTEND;TZID=Asia/Manila:{endLocal}       // start + 2h, same format
SUMMARY:{event.title}
DESCRIPTION:{event.description ?? ''}
LOCATION:{event.location ?? ''}
END:VEVENT
END:VCALENDAR
```
`startLocal` = `event.event_date` converted to UTC+8 (add 8 hours), formatted as `YYYYMMDDTHHmmss`.

File name: `{slugified event title}.ics`

### Files
| File | Change |
|------|--------|
| `apps/member/src/components/AddToCalendarSheet.tsx` | **New** — bottom sheet component |
| `apps/member/src/pages/events/EventTicket.tsx` | Add `showCalSheet` state + ghost button (below ticket card, above hint text) |

---

## Feature 2: Event Broadcasts

### Scope
- New DB table + RLS + Realtime publication
- New store: `useNotificationsStore`
- Organizer compose sheet component
- Member: wire unread badge on existing bell icon; replace `NotificationsInbox.tsx` placeholder with real feed

### Database

```sql
CREATE TABLE event_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  organizer_id uuid REFERENCES profiles(id) NOT NULL,
  message      text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read announcements
CREATE POLICY "announcements_select"
  ON event_announcements FOR SELECT
  TO authenticated USING (true);

-- Organizers can only insert announcements for events in their own chapter
CREATE POLICY "announcements_insert"
  ON event_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN events e ON e.id = event_id
      WHERE p.id = auth.uid()
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (p.role IN ('hq_admin', 'super_admin') OR e.chapter_id = p.chapter_id)
    )
  );
```

Add `event_announcements` to the Supabase Realtime publication (via Supabase dashboard or `ALTER PUBLICATION supabase_realtime ADD TABLE event_announcements`).

Migration file: `supabase/migrations/20260316000000_add_event_announcements.sql`

### Store: `useNotificationsStore`

```ts
interface Notification {
  id: string
  event_id: string
  event_title: string   // resolved at fetch/receive time from useEventsStore.events
  message: string
  created_at: string
  read: boolean
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  subscribe: (registeredEventIds: string[], eventTitles: Record<string, string>) => () => void
  markAllRead: () => void
  fetchRecent: (registeredEventIds: string[], eventTitles: Record<string, string>) => Promise<void>
}
```

**`fetchRecent`** — queries `event_announcements` with `WHERE event_id = ANY(approvedIds)` (scoped strictly to the caller's registered events), ordered `created_at DESC`, limited to 50 rows. Maps `event_id` to title using the provided `eventTitles` map (derived from `useEventsStore.events` at call time). If a title is missing (events not yet loaded), falls back to `'Event'`.

**`subscribe`** — sets up:
```ts
supabase
  .channel('member-announcements')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'event_announcements',
    filter: `event_id=in.(${approvedIds.join(',')})`,   // scoped to member's events only
  }, handler)
  .subscribe()
```
New rows prepend to `notifications` with `read: false` and trigger `toast.info(\`📣 ${eventTitle}: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}\`)`. Returns the channel's `unsubscribe` function for cleanup.

**In-memory only** — not persisted to localStorage. State resets on page reload; `fetchRecent` always re-hydrates on mount.

### Initialization in MemberLayout

In `MemberLayout`, add a `useEffect` that watches `registrations` from `useEventsStore`:

```ts
const { registrations } = useEventsStore()
const { events } = useEventsStore()
const { subscribe, fetchRecent } = useNotificationsStore()

useEffect(() => {
  if (registrations.length === 0) return
  const approvedIds = registrations
    .filter(r => r.status === 'approved')
    .map(r => r.event_id)
  if (approvedIds.length === 0) return
  const titles = Object.fromEntries(events.map(e => [e.id, e.title]))
  void fetchRecent(approvedIds, titles)
  const unsub = subscribe(approvedIds, titles)
  return unsub
}, [registrations.length]) // re-subscribe if registration count changes
```

### Member: Notification bell badge

The bell button already exists in `Dashboard.tsx` (navigates to `/notifications`). Add an unread badge:

```tsx
<button onClick={() => navigate('/notifications')} ...>
  <Bell className="w-4.5 h-4.5 text-white" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4
                     bg-red text-white text-[9px] font-bold rounded-full
                     flex items-center justify-center px-1">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</button>
```

The button wrapper needs `relative` positioning to anchor the badge.

### Member: `/notifications` — `NotificationsInbox.tsx`

Replace the "coming soon" placeholder with the real feed. `profile/notifications` (the notification *settings* page) is not touched.

Layout:
- Same sticky `bg-primary` header with back button + "Notifications" title as the current placeholder
- `markAllRead()` called on mount
- List of notifications sorted by `created_at DESC`
- Each row:
  - Event name pill (`bg-primary/10 text-primary text-[10px] font-bold rounded-full px-2 py-0.5`)
  - Message body (`text-sm text-slate-900`)
  - Timestamp using `formatDate.compact(created_at)` — existing utility, no new dependency needed
  - Subtle divider between rows
- Empty state: `BellOff` icon + "No announcements yet" + subtext "Event updates from organizers will appear here."

### Organizer: Compose UI

**OrgEventDetail page** (`apps/member/src/pages/organizer/events/EventDetail.tsx`):
Add a "Send Announcement" button in the event actions section:
```tsx
<button onClick={() => setShowAnnounce(true)}
  className="w-full py-3 border border-blue/30 text-blue font-bold text-sm rounded-2xl
             flex items-center justify-center gap-2 hover:bg-blue/5 transition-colors">
  <Megaphone className="w-4 h-4" />
  Send Announcement
</button>
```

**OrgEventRegistrants page** (`apps/member/src/pages/organizer/events/EventRegistrants.tsx`):
Add a "Announce" button to the blue sticky header row (alongside the existing back button):
```tsx
<button onClick={() => setShowAnnounce(true)}
  className="ml-auto bg-white/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5
             text-white text-xs font-bold">
  <Megaphone className="w-3.5 h-3.5" />
  Announce
</button>
```

### Component: `<SendAnnouncementSheet />`

Props:
```ts
interface SendAnnouncementSheetProps {
  eventId: string
  eventTitle: string
  isOpen: boolean
  onClose: () => void
}
```

State: `message: string`, `isSending: boolean`, `sendError: string | null`

Behavior:
- Uses the same framer-motion bottom sheet pattern (AnimatePresence + spring)
- Textarea: `rows={4}`, `maxLength={500}`, placeholder `"Write your announcement…"`, live `{message.length}/500` counter in bottom-right corner of textarea wrapper
- "Send to all approved registrants" in `text-xs text-slate-400` below textarea
- Send button: disabled when `message.trim().length === 0` or `isSending`; shows `"Sending…"` during request
- On success: `toast.success('Announcement sent')`, clear message, `onClose()`
- On error: `sendError` displayed as `text-xs text-red` inline above the button; button re-enabled
- Cancel button: `text-sm text-slate-500`, calls `onClose()`

### Files
| File | Change |
|------|--------|
| `supabase/migrations/20260316000000_add_event_announcements.sql` | **New** — table + RLS |
| `apps/member/src/stores/useNotificationsStore.ts` | **New** |
| `apps/member/src/components/AddToCalendarSheet.tsx` | **New** |
| `apps/member/src/components/SendAnnouncementSheet.tsx` | **New** |
| `apps/member/src/components/MemberLayout.tsx` | Add notification store init `useEffect` |
| `apps/member/src/pages/dashboard/Dashboard.tsx` | Wire unread badge on existing bell button |
| `apps/member/src/pages/notifications/NotificationsInbox.tsx` | Replace placeholder with real feed |
| `apps/member/src/pages/events/EventTicket.tsx` | Add ghost button + `AddToCalendarSheet` |
| `apps/member/src/pages/organizer/events/EventDetail.tsx` | Add "Send Announcement" button |
| `apps/member/src/pages/organizer/events/EventRegistrants.tsx` | Add "Announce" button to header |

---

## Out of Scope
- Push notifications (device-level)
- Announcement editing or deletion by organizer
- Organizer view of announcement history
- Read receipts per member
- Organizer broadcasts through `/notifications` (organizers use their own Supabase Realtime subscription via Supabase client directly — the `useNotificationsStore` is member-only)
