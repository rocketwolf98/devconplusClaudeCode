# Add to Calendar + Event Broadcasts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Add to Calendar" shortcut to the EventTicket screen, and an event-scoped broadcast/announcement feature where organizers send messages that approved registrants receive as in-app Realtime notifications.

**Architecture:** Feature 1 is frontend-only — a bottom sheet that builds a Google Calendar URL or generates an `.ics` Blob from event data. Feature 2 uses a new `event_announcements` Supabase table + Realtime postgres_changes subscription (no filter — handler filters by event_id); organizers insert rows from two entry points (Event Detail + Registrants page); members receive them via a Zustand store and see them in the existing `/notifications` inbox with a bell badge on Dashboard.

**Tech Stack:** React 19, TypeScript strict, Zustand 5, Supabase Realtime, framer-motion, lucide-react, sonner (toasts), Tailwind CSS v3

---

## Chunk 1: Add to Calendar

### Task 1: Create `AddToCalendarSheet` component

**Files:**
- Create: `apps/member/src/components/AddToCalendarSheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
// apps/member/src/components/AddToCalendarSheet.tsx
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Download, ExternalLink } from 'lucide-react'
import type { Event } from '@devcon-plus/supabase'

interface Props {
  event: Event
  isOpen: boolean
  onClose: () => void
}

/** Convert a UTC Date to Asia/Manila (UTC+8) and format as YYYYMMDDTHHmmss */
function toManilaLocal(date: Date): string {
  const manilaOffset = 8 * 60 * 60 * 1000
  const local = new Date(date.getTime() + manilaOffset)
  return local.toISOString().replace(/[-:]/g, '').slice(0, 15)
}

/** Format a Date as YYYYMMDDTHHmmssZ (UTC, for Google Calendar) */
function toUTCCompact(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
}

export default function AddToCalendarSheet({ event, isOpen, onClose }: Props) {
  if (!event.event_date) return null

  const start = new Date(event.event_date)
  // Use end_date if available; fall back to start + 2 hours
  const end = event.end_date
    ? new Date(event.end_date)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const handleGoogleCalendar = () => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${toUTCCompact(start)}/${toUTCCompact(end)}`,
      details: event.description ?? '',
      location: event.location ?? '',
      ctz: 'Asia/Manila',
    })
    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      '_blank',
      'noopener,noreferrer'
    )
    onClose()
  }

  const handleIcal = () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DEVCON+//Events//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@devconplus`,
      `DTSTART;TZID=Asia/Manila:${toManilaLocal(start)}`,
      `DTEND;TZID=Asia/Manila:${toManilaLocal(end)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description ?? '').replace(/\n/g, '\\n')}`,
      `LOCATION:${event.location ?? ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.toLowerCase().replace(/\s+/g, '-')}.ics`
    a.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[35] bg-white rounded-t-3xl px-5 pt-4 pb-10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Add to Calendar</h3>
            <p className="text-sm text-slate-400 mb-5">{event.title}</p>

            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGoogleCalendar}
                className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900">Google Calendar</p>
                  <p className="text-xs text-slate-400">Opens in browser</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleIcal}
                className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900">iCal / Other Calendars</p>
                  <p className="text-xs text-slate-400">Downloads .ics — Apple Calendar, Outlook</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: no errors in `AddToCalendarSheet.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/components/AddToCalendarSheet.tsx
git commit -m "feat(calendar): add AddToCalendarSheet component"
```

---

### Task 2: Wire Add to Calendar into EventTicket

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx`

- [ ] **Step 1: Add import and state**

Add imports at the top of `EventTicket.tsx`:
```tsx
import AddToCalendarSheet from '../../components/AddToCalendarSheet'
import { CalendarPlus } from 'lucide-react'   // add to the existing lucide import line
```

Inside the `EventTicket` component body (near the other `useState` declarations):
```tsx
const [showCalSheet, setShowCalSheet] = useState(false)
```

- [ ] **Step 2: Add ghost button**

The component returns a `<div className="min-h-screen flex flex-col" ...>` as the outermost container. Inside it there is a scrollable `<div className="flex flex-col items-center px-5 pt-20 pb-12">`. The "Add to Calendar" ghost button goes **inside this scrollable div**, after the closing `</motion.div>` of the ticket card and before the hint `<motion.p>`:

```tsx
{/* Add to Calendar — hidden when no date or event is past */}
{event.event_date && event.status !== 'past' && (
  <motion.button
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.65, duration: 0.3 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setShowCalSheet(true)}
    className="w-full max-w-sm flex items-center justify-center gap-2
               bg-white/[0.18] border border-white/30 text-white
               rounded-2xl py-3 text-sm font-semibold backdrop-blur-sm"
  >
    <CalendarPlus className="w-4 h-4" />
    Add to Calendar
  </motion.button>
)}
```

- [ ] **Step 3: Add the sheet at the page root level**

The `AddToCalendarSheet` uses `fixed` positioning so it must be rendered at the root of the component return (not inside the scrollable div), alongside the existing `AnimatePresence` for the cancel sheets. Add it just before the outermost closing `</div>`:

```tsx
<AddToCalendarSheet
  event={event}
  isOpen={showCalSheet}
  onClose={() => setShowCalSheet(false)}
/>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 5: Manual verification**

Start dev server (`npm run dev:member`), navigate to an approved event ticket. Confirm:
- "Add to Calendar" ghost button appears below the ticket card
- Tapping it opens the bottom sheet with two options
- "Google Calendar" opens a new browser tab with event details pre-filled
- "iCal / Other Calendars" downloads a `.ics` file
- Button is hidden on a `past` event or when `event_date` is null

- [ ] **Step 6: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "feat(calendar): wire AddToCalendarSheet into EventTicket"
```

---

## Chunk 2: Broadcasts — Database + Store

### Task 3: Apply DB migration for `event_announcements`

**Files:**
- Create: `supabase/migrations/20260316000000_add_event_announcements.sql`
- Update: `packages/supabase/src/database.types.ts` (regenerated)

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260316000000_add_event_announcements.sql

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

-- chapter_officer: can only insert for events in their own chapter
-- hq_admin / super_admin: can insert for any event
CREATE POLICY "announcements_insert"
  ON event_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN events e ON e.id = event_id
      WHERE p.id = auth.uid()
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR e.chapter_id = p.chapter_id
        )
    )
  );

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE event_announcements;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool with the SQL above.

> **Manual step required:** The `ALTER PUBLICATION supabase_realtime ADD TABLE event_announcements` SQL statement requires the `supabase_realtime` publication to already exist. On managed Supabase projects this publication exists by default. However, you should verify Realtime is enabled for the table in the Supabase dashboard: **Database → Replication → Tables** → confirm `event_announcements` appears. If the SQL step fails with a publication error, enable Realtime for the table manually via the dashboard instead.

- [ ] **Step 3: Regenerate TypeScript types**

Use `mcp__supabase__generate_typescript_types` and overwrite `packages/supabase/src/database.types.ts`.

Verify the regenerated file contains `event_announcements` in the `Tables` section with columns: `id`, `event_id`, `organizer_id`, `message`, `created_at`. Without this the Supabase client calls in Tasks 4 and 5 will produce TypeScript errors.

Update the file header comment to note: `// Last generated: 2026-03-16 (adds event_announcements table)`

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors (new table is in generated types)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260316000000_add_event_announcements.sql \
        packages/supabase/src/database.types.ts
git commit -m "feat(broadcasts): add event_announcements table, RLS, and Realtime"
```

---

### Task 4: Create `useNotificationsStore`

**Files:**
- Create: `apps/member/src/stores/useNotificationsStore.ts`

- [ ] **Step 1: Create the store**

```ts
// apps/member/src/stores/useNotificationsStore.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export interface Notification {
  id: string
  event_id: string
  event_title: string
  message: string
  created_at: string
  read: boolean
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  fetchRecent: (approvedIds: string[], eventTitles: Record<string, string>) => Promise<void>
  subscribe: (approvedIds: string[], eventTitles: Record<string, string>) => () => void
  markAllRead: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchRecent: async (approvedIds, eventTitles) => {
    if (approvedIds.length === 0) return
    const { data } = await supabase
      .from('event_announcements')
      .select('id, event_id, message, created_at')
      .in('event_id', approvedIds)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!data) return
    const notifications: Notification[] = data.map((row) => ({
      id: row.id,
      event_id: row.event_id,
      message: row.message,
      created_at: row.created_at,
      event_title: eventTitles[row.event_id] ?? 'Event',
      read: false,
    }))
    // All fetched items count as unread (user hasn't opened inbox since load)
    set({ notifications, unreadCount: notifications.length })
  },

  subscribe: (approvedIds, eventTitles) => {
    if (approvedIds.length === 0) return () => {}
    const approvedSet = new Set(approvedIds)
    const channel = supabase
      .channel('member-announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_announcements',
          // No filter — Supabase Realtime postgres_changes does not reliably
          // support the `in` operator. Filter in the handler instead.
        },
        (payload) => {
          const row = payload.new as {
            id: string
            event_id: string
            message: string
            created_at: string
          }
          // Drop announcements for events the user is not registered to
          if (!approvedSet.has(row.event_id)) return
          const eventTitle = eventTitles[row.event_id] ?? 'Event'
          const notification: Notification = {
            id: row.id,
            event_id: row.event_id,
            event_title: eventTitle,
            message: row.message,
            created_at: row.created_at,
            read: false,
          }
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }))
          const preview = row.message.length > 60
            ? `${row.message.slice(0, 60)}…`
            : row.message
          toast.info(`📣 ${eventTitle}: ${preview}`)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },
}))
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: no errors in `useNotificationsStore.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/stores/useNotificationsStore.ts
git commit -m "feat(broadcasts): add useNotificationsStore with Realtime subscription"
```

---

## Chunk 3: Broadcasts — Organizer UI

### Task 5: Create `SendAnnouncementSheet` component

**Files:**
- Create: `apps/member/src/components/SendAnnouncementSheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
// apps/member/src/components/SendAnnouncementSheet.tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { useOrganizerUser } from '../stores/useOrgAuthStore'

interface Props {
  eventId: string
  eventTitle: string
  isOpen: boolean
  onClose: () => void
}

export default function SendAnnouncementSheet({ eventId, eventTitle, isOpen, onClose }: Props) {
  // Use useOrganizerUser() to match the existing organizer auth pattern
  // (same UUID as useAuthStore().user.id — organizer flow keeps both in sync)
  const organizerUser = useOrganizerUser()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const handleClose = () => {
    if (isSending) return
    setMessage('')
    setSendError(null)
    onClose()
  }

  const handleSend = async () => {
    if (!organizerUser || message.trim().length === 0) return
    setIsSending(true)
    setSendError(null)
    const { error } = await supabase
      .from('event_announcements')
      .insert({ event_id: eventId, organizer_id: organizerUser.id, message: message.trim() })
    if (error) {
      setSendError('Failed to send. Please try again.')
      setIsSending(false)
      return
    }
    toast.success('Announcement sent')
    setMessage('')
    onClose()
    setIsSending(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[45] bg-white rounded-t-3xl px-5 pt-4 pb-10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-4 h-4 text-blue" />
              <h3 className="text-base font-bold text-slate-900">Send Announcement</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">{eventTitle}</p>

            <div className="relative mb-1">
              <textarea
                rows={4}
                maxLength={500}
                value={message}
                onChange={(e) => { setMessage(e.target.value); setSendError(null) }}
                placeholder="Write your announcement…"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900
                           placeholder-slate-400 resize-none focus:outline-none focus:ring-2
                           focus:ring-blue/30"
              />
              <span className="absolute bottom-3 right-3 text-[10px] text-slate-400">
                {message.length}/500
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">Sends to all approved registrants</p>

            {sendError && (
              <p className="text-xs text-red mb-3">{sendError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isSending}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold
                           disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={message.trim().length === 0 || isSending}
                className="flex-1 py-3 rounded-xl bg-blue text-white text-sm font-bold
                           disabled:opacity-50"
              >
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/components/SendAnnouncementSheet.tsx
git commit -m "feat(broadcasts): add SendAnnouncementSheet component"
```

---

### Task 6: Wire Send Announcement into `OrgEventDetail`

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventDetail.tsx`

- [ ] **Step 1: Add import and state**

Add to the lucide import line (already has `ArrowLeft, CalendarDays, Zap, Trash2, AlertTriangle`):
```tsx
import { ArrowLeft, CalendarDays, Zap, Trash2, AlertTriangle, Megaphone } from 'lucide-react'
```

Add below existing imports:
```tsx
import SendAnnouncementSheet from '../../../components/SendAnnouncementSheet'
```

Add state inside `OrgEventDetail` (near other `useState` calls, around line 12):
```tsx
const [showAnnounce, setShowAnnounce] = useState(false)
```

- [ ] **Step 2: Add "Send Announcement" button before "View Registrants"**

The "View Registrants" `motion.button` is at the bottom of the `motion.div` with `variants={staggerContainer}` (around line 140). Add a new button directly before it:

```tsx
<motion.button
  variants={fadeUp}
  onClick={() => setShowAnnounce(true)}
  className="w-full py-3 mb-3 border border-blue/30 text-blue text-sm font-bold rounded-xl
             hover:bg-blue/5 transition-colors flex items-center justify-center gap-2"
  whileTap={{ scale: 0.98 }}
>
  <Megaphone className="w-4 h-4" />
  Send Announcement
</motion.button>
```

- [ ] **Step 3: Add the sheet at end of return**

After the closing `</AnimatePresence>` for the delete confirmation sheets (just before the final `</div>`):
```tsx
<SendAnnouncementSheet
  eventId={event.id}
  eventTitle={event.title}
  isOpen={showAnnounce}
  onClose={() => setShowAnnounce(false)}
/>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventDetail.tsx
git commit -m "feat(broadcasts): add Send Announcement to OrgEventDetail"
```

---

### Task 7: Wire Announce button into `OrgEventRegistrants`

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventRegistrants.tsx`

- [ ] **Step 1: Add import and state**

Add to the lucide import line (currently has `ArrowLeft, Check, ClipboardList`):
```tsx
import { ArrowLeft, Check, ClipboardList, Megaphone } from 'lucide-react'
```

Add after existing imports:
```tsx
import SendAnnouncementSheet from '../../../components/SendAnnouncementSheet'
```

Add state in the component body (near `setFilter` and `setIsLoading`):
```tsx
const [showAnnounce, setShowAnnounce] = useState(false)
```

- [ ] **Step 2: Add Announce button to sticky header**

The sticky header `div` is currently:
```tsx
<div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
```

Add `relative` to it and restructure the title row to accommodate the button:
```tsx
<div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl relative">
  <div className="flex items-center justify-between mb-3">
    <button
      onClick={() => navigate(-1)}
      className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
    >
      <ArrowLeft className="w-5 h-5 text-white" />
    </button>
    {event && (
      <button
        onClick={() => setShowAnnounce(true)}
        className="bg-white/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5
                   text-white text-xs font-bold"
      >
        <Megaphone className="w-3.5 h-3.5" />
        Announce
      </button>
    )}
  </div>
  <h1 className="text-xl font-bold text-white">Registrants</h1>
  <p className="text-white/60 text-sm mt-0.5">{event?.title ?? 'Event'}</p>
</div>
```

Note: The original header has a single back button without a flex row. This restructure adds the flex row for back + announce. Check the existing DOM structure at line ~125 before editing to ensure all child elements are preserved.

- [ ] **Step 3: Add the sheet at end of return**

Just before the final `</div>`:
```tsx
{event && (
  <SendAnnouncementSheet
    eventId={event.id}
    eventTitle={event.title}
    isOpen={showAnnounce}
    onClose={() => setShowAnnounce(false)}
  />
)}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventRegistrants.tsx
git commit -m "feat(broadcasts): add Announce button to OrgEventRegistrants header"
```

---

## Chunk 4: Broadcasts — Member Notifications UI

### Task 8: Initialize notification store in `MemberLayout`

**Files:**
- Modify: `apps/member/src/components/MemberLayout.tsx`

- [ ] **Step 1: Add imports**

At the top of `MemberLayout.tsx`, add:
```tsx
import { useNotificationsStore } from '../stores/useNotificationsStore'
```

`useEventsStore` is already imported.

- [ ] **Step 2: Add store reads and useEffects inside MemberLayout**

`MemberLayout` already reads `subscribeToEventChanges` and `subscribeToRewardChanges`. Add after those reads:

```tsx
const { registrations, events, fetchRegistrations } = useEventsStore()
const { fetchRecent, subscribe } = useNotificationsStore()
```

Note: `useEventsStore` is already on line 17 as `const subscribeToEventChanges = useEventsStore((s) => s.subscribeToChanges)`. Replace that line and add the multi-selector pattern:

```tsx
const subscribeToEventChanges = useEventsStore((s) => s.subscribeToChanges)
const fetchRegistrations = useEventsStore((s) => s.fetchRegistrations)
const registrations = useEventsStore((s) => s.registrations)
const events = useEventsStore((s) => s.events)
```

- [ ] **Step 3: Fetch registrations on mount and wire notification subscription**

Add a new `useEffect` after the existing Realtime subscription effect (after line 33). The `user` variable is already available from `useAuthStore`:

```tsx
// Fetch registrations on mount so notification subscription has event IDs
useEffect(() => {
  if (user) void fetchRegistrations(user.id)
}, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

// Subscribe to announcements once registrations are loaded
useEffect(() => {
  const approvedIds = registrations
    .filter((r) => r.status === 'approved')
    .map((r) => r.event_id)
  if (approvedIds.length === 0) return
  const eventTitles = Object.fromEntries(events.map((e) => [e.id, e.title]))
  void fetchRecent(approvedIds, eventTitles)
  const unsub = subscribe(approvedIds, eventTitles)
  return unsub
}, [registrations.length]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/components/MemberLayout.tsx
git commit -m "feat(broadcasts): fetch registrations and initialize notification store in MemberLayout"
```

---

### Task 9: Wire unread badge on Dashboard bell button

**Files:**
- Modify: `apps/member/src/pages/dashboard/Dashboard.tsx`

- [ ] **Step 1: Add store import and destructure unreadCount**

Add import near the existing store imports:
```tsx
import { useNotificationsStore } from '../../stores/useNotificationsStore'
```

Inside the `Dashboard` component body (near other store reads):
```tsx
const unreadCount = useNotificationsStore((s) => s.unreadCount)
```

- [ ] **Step 2: Update the bell button**

The current bell button is around line 99. It has a bug: `bg-white\20` (backslash) — fix it to `bg-white/20` while editing. Replace the entire button:

```tsx
<button
  onClick={() => navigate('/notifications')}
  className="relative w-9 h-9 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
>
  <Bell className="w-[18px] h-[18px] text-white" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4
                     bg-red text-white text-[9px] font-bold rounded-full
                     flex items-center justify-center px-1 leading-none">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</button>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/dashboard/Dashboard.tsx
git commit -m "feat(broadcasts): wire unread badge on dashboard notification bell"
```

---

### Task 10: Replace `NotificationsInbox` with real announcement feed

**Files:**
- Modify: `apps/member/src/pages/notifications/NotificationsInbox.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
// apps/member/src/pages/notifications/NotificationsInbox.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BellOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNotificationsStore } from '../../stores/useNotificationsStore'
import { formatDate } from '../../lib/dates'
import { staggerContainer, cardItem } from '../../lib/animation'

interface NotificationsInboxProps {
  isOrganizer?: boolean
}

export default function NotificationsInbox({ isOrganizer = false }: NotificationsInboxProps) {
  const navigate = useNavigate()
  const { notifications, markAllRead } = useNotificationsStore()

  // Mark all as read when inbox is opened
  useEffect(() => {
    markAllRead()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className={`${isOrganizer ? 'bg-blue' : 'bg-primary'} px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl`}>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">Notifications</h1>
        <p className="text-white/60 text-sm mt-0.5">Event announcements from organizers</p>
      </div>

      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 pt-20 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
              <BellOff className="w-9 h-9 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-700">No announcements yet</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Event updates from organizers will appear here.
            </p>
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                variants={cardItem}
                className="bg-white rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {n.event_title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate.compact(n.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{n.message}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 3: Manual end-to-end verification**

1. Sign in as an organizer. Open an event detail page → tap "Send Announcement" → write a message → tap "Send". Confirm `toast.success` appears.
2. Open the registrants page for the same event → tap "Announce" → send another message.
3. Sign in as a member with an approved registration for that event.
4. On Dashboard: bell badge shows `2` (or the count from fetchRecent).
5. Send a third announcement while the member session is active — `sonner toast` appears at the bottom of the screen.
6. Navigate to `/notifications` — all three announcements appear as cards with event name pill and date. Badge clears to `0`.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/notifications/NotificationsInbox.tsx
git commit -m "feat(broadcasts): replace NotificationsInbox placeholder with real announcement feed"
```
