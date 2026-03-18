# Dismiss Notifications — Member & Organizer
**Date:** 2026-03-18
**Status:** Approved
**Scope:** `apps/member/` — notifications inbox (member + organizer)

---

## Overview

Users (members and organizers) can dismiss individual notification cards or clear the entire list. Dismissal is in-memory only (session-scoped), consistent with how the existing `read` state works. No database changes are required.

---

## Decisions

| Question | Decision |
|---|---|
| Persistence | In-memory (Zustand) only — dismissed items return on page reload |
| Per-item gesture | X (`lucide-react` `X` icon) button on each card |
| Bulk action | "Clear all" text button above the list, visible only when list is non-empty |
| Exit animation | `AnimatePresence` slide-right + fade (`x: 40, opacity: 0, transition: { duration: 0.2 }`) |
| Empty state after clear | Existing `BellOff` empty state — no changes needed |
| Surface coverage | Member (`/notifications`) and organizer (`/organizer/notifications`) share `NotificationsInbox` — both get the feature automatically |

---

## 1. Store — `useNotificationsStore.ts`

Add two actions to `NotificationsState`:

```ts
dismiss: (id: string) => void
clearAll: () => void
```

### `dismiss(id)`
Remove the notification with the given `id` from the array. If it was unread (`read: false`), decrement `unreadCount` by 1 (floor at 0).

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
```

### `clearAll()`
Reset both `notifications` and `unreadCount` to empty.

```ts
clearAll: () => set({ notifications: [], unreadCount: 0 }),
```

---

## 2. UI — `NotificationsInbox.tsx`

### Imports added
- `AnimatePresence` from `framer-motion` (already installed)
- `X` from `lucide-react`
- `dismiss`, `clearAll` destructured from `useNotificationsStore()`

### "Clear all" button
Rendered inside the header block, right-aligned, only when `notifications.length > 0`:

```tsx
{notifications.length > 0 && (
  <div className="flex justify-end mt-3">
    <button
      onClick={clearAll}
      className="text-xs text-white/70 active:text-white/50"
    >
      Clear all
    </button>
  </div>
)}
```

### Per-item X button
Inside each notification card, positioned absolute top-right:

```tsx
<motion.div
  key={n.id}
  variants={cardItem}
  exit={{ x: 40, opacity: 0, transition: { duration: 0.2 } }}
  className="relative bg-white rounded-2xl border border-slate-100 p-4"
>
  <button
    onClick={() => dismiss(n.id)}
    className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center text-slate-300 active:text-slate-500"
    aria-label="Dismiss notification"
  >
    <X className="w-3.5 h-3.5" />
  </button>
  {/* existing card content */}
</motion.div>
```

### `AnimatePresence` wrapper
Wrap the notification list `motion.div` with `AnimatePresence`:

```tsx
<AnimatePresence>
  {notifications.map((n) => (
    <motion.div key={n.id} ... exit={{ x: 40, opacity: 0 }}>
      ...
    </motion.div>
  ))}
</AnimatePresence>
```

The outer `motion.div` with `variants={staggerContainer}` is retained as-is around `AnimatePresence`.

---

## 3. File Summary

| File | Change |
|---|---|
| `apps/member/src/stores/useNotificationsStore.ts` | Add `dismiss(id)` + `clearAll()` |
| `apps/member/src/pages/notifications/NotificationsInbox.tsx` | Add X button per card, Clear all button in header, `AnimatePresence` exit animations |

---

## 4. Out of Scope

- Persisting dismissals to Supabase or localStorage
- Swipe-to-dismiss gesture (X button is sufficient for MVP)
- Undo / restore dismissed notifications
