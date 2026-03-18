# Dismiss Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-item dismiss (X button) and "Clear all" to the notifications inbox for both member and organizer surfaces.

**Architecture:** Two files change. The Zustand store gains `dismiss(id)` and `clearAll()` actions. The inbox component adds an X button on each card, a "Clear all" button in the header, and wraps the list with `AnimatePresence mode="popLayout"` for smooth exit animations. Dismissal is in-memory only — consistent with the existing `read` state.

**Tech Stack:** React 19, TypeScript strict, Zustand v5, framer-motion (`AnimatePresence`), lucide-react (`X`)

---

## File Map

| File | Change |
|---|---|
| `apps/member/src/stores/useNotificationsStore.ts` | Add `dismiss` + `clearAll` to interface and implementation |
| `apps/member/src/pages/notifications/NotificationsInbox.tsx` | X button per card, Clear all button, `AnimatePresence` exit animations |

---

### Task 1: Store — add `dismiss` and `clearAll`

**Files:**
- Modify: `apps/member/src/stores/useNotificationsStore.ts`

**Context:** The store is a Zustand `create<NotificationsState>` store. `NotificationsState` is an interface defined at the top. The existing actions are `fetchRecent`, `subscribe`, `markAllRead`. Add `dismiss` and `clearAll` to the interface and to the store implementation object.

- [ ] **Step 1: Add the two action signatures to `NotificationsState`**

In `apps/member/src/stores/useNotificationsStore.ts`, add after `markAllRead: () => void`:

```ts
  dismiss: (id: string) => void
  clearAll: () => void
```

The full updated interface:

```ts
interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  fetchRecent: (approvedIds: string[], eventTitles: Record<string, string>) => Promise<void>
  subscribe: (approvedIds: string[], eventTitles: Record<string, string>) => () => void
  markAllRead: () => void
  dismiss: (id: string) => void
  clearAll: () => void
}
```

- [ ] **Step 2: Add the implementations at the bottom of the store object**

After the closing brace of `markAllRead`, add:

```ts
  dismiss: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id)
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: target && !target.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: `0 errors` across both packages.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/stores/useNotificationsStore.ts
git commit -m "feat(notifications): add dismiss and clearAll store actions"
```

---

### Task 2: UI — X button, Clear all, AnimatePresence

**Files:**
- Modify: `apps/member/src/pages/notifications/NotificationsInbox.tsx`

**Context:** The component renders a header with `bg-primary` (or `bg-blue` for organizer) and a scrollable list of notification cards. The list is wrapped in a `motion.div` with `variants={staggerContainer}`. Each card is a `motion.div` with `variants={cardItem}`. Both `staggerContainer` and `cardItem` are imported from `../../lib/animation`.

**Important layout detail:** The header currently has `<h1>` and `<p>` as direct children after the back button. Wrap them in a flex row with the "Clear all" button so they sit on the same baseline.

**Important card detail:** The X button is positioned `absolute top-2 right-2`. The event title chip and timestamp row inside the card need `pr-6` added to prevent the chip from sliding under the X button.

- [ ] **Step 1: Update imports**

Replace the existing import lines at the top of `NotificationsInbox.tsx`:

```tsx
import { ArrowLeft, BellOff } from 'lucide-react'
import { motion } from 'framer-motion'
```

with:

```tsx
import { ArrowLeft, BellOff, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
```

- [ ] **Step 2: Destructure `dismiss` and `clearAll` from the store**

Replace:

```tsx
  const { notifications, markAllRead } = useNotificationsStore()
```

with:

```tsx
  const { notifications, markAllRead, dismiss, clearAll } = useNotificationsStore()
```

- [ ] **Step 3: Add "Clear all" button to the header**

Replace the current header title/subtitle block:

```tsx
        <h1 className="text-white text-xl font-bold">Notifications</h1>
        <p className="text-white/60 text-sm mt-0.5">Event announcements from organizers</p>
```

with a flex row that aligns the title/subtitle left and "Clear all" right:

```tsx
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Notifications</h1>
            <p className="text-white/60 text-sm mt-0.5">Event announcements from organizers</p>
          </div>
          {notifications.length > 0 && (
            <motion.button
              onClick={clearAll}
              whileTap={{ scale: 0.95 }}
              className="text-xs text-white/70 active:text-white/50 pb-0.5"
            >
              Clear all
            </motion.button>
          )}
        </div>
```

- [ ] **Step 4: Replace the notification list with AnimatePresence + exit + X button**

Replace the entire `motion.div` list block (the `else` branch inside `<div className="p-4">`):

```tsx
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                variants={cardItem}
                exit={{ x: 40, opacity: 0, transition: { duration: 0.2 } }}
                className="relative bg-white rounded-2xl border border-slate-100 p-4"
              >
                <motion.button
                  onClick={() => dismiss(n.id)}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-slate-300 active:text-slate-500"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
                <div className="flex items-center justify-between mb-2 pr-6">
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
          </AnimatePresence>
        </motion.div>
```

Key changes from the original:
- `motion.div` wrapper retains `staggerContainer` for enter animation
- `AnimatePresence mode="popLayout"` wraps the map so exits animate smoothly
- Each card is now `relative` and has the X button as `absolute top-2 right-2`
- Card content row gets `pr-6` to avoid overlapping the X button

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: `0 errors` across both packages.

- [ ] **Step 6: Visual check in browser**

```bash
npm run dev:member
```

Navigate to `/notifications` (member) and `/organizer/notifications` (organizer). Verify:
- Each card has a small X button top-right
- Tapping X removes the card with a slide-right + fade animation
- Items below it reflow smoothly (no jump)
- "Clear all" button appears in the header only when notifications exist
- Tapping "Clear all" removes all cards and shows the BellOff empty state
- After clearing, the "Clear all" button disappears from the header

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/notifications/NotificationsInbox.tsx
git commit -m "feat(notifications): add per-item dismiss and clear all with exit animations"
```
