# Spec: Event Program Category + Per-Event Color Theming

**Date:** 2026-03-17
**Status:** Approved
**Scope:** EventCreate form + EventDetail + EventTicket

---

## Problem

Events belong to one of four DEVCON programs (DEVCON, DEVCON Kids, #SheIsDEVCON, Campus DEVCON), but the event creation form has no way to express this. Additionally, when a member opens an event that belongs to a specific program, the detail pages show the user's global theme color rather than the program's color — missing an opportunity for visual context and brand distinction.

Two gaps:
1. No `devcon_category` field on the event creation form
2. EventDetail and EventTicket always use the user's global theme, ignoring the event's program identity

---

## Approach

### Part 1: Data model

Add `devcon_category: DevconCategory | null` (where `DevconCategory = 'devcon' | 'she' | 'kids' | 'campus'`) to:
- `packages/supabase/src/types.ts` — export `DevconCategory` type + add field to `Event` interface
- `CreateEventPayload` type in `apps/member/src/stores/useEventsStore.ts`
- A handful of mock events in the mock data (`packages/supabase/src/mock/`) — seed at least one event per program category so the visual theming is testable

> **Note:** `createEvent` sends this field to Supabase on insert. It will fail with a `42703` column-not-found error against a live DB until a migration adds the column. This is acceptable in the mock-data phase — add a `// TODO: add devcon_category column to events table` comment in the store.

The values match the existing `PROGRAM_THEMES` IDs exactly (`useThemeStore` already defines these four IDs), so no new mapping table is needed.

### Part 2: EventCreate form field

Add a **"DEVCON Program"** field to the CATEGORIZATION section of `OrgEventCreate`, positioned just above the existing CATEGORY chips. The field is optional (no asterisk).

**UI:** Radio pills, same pattern as the CATEGORY field.

```
[ DEVCON ]  [ DEVCON Kids ]  [ #SheIsDEVCON ]  [ Campus DEVCON ]
```

- When a pill is selected, it highlights in that program's own primary color (not generic blue)
- Tapping a selected pill deselects it (sets value back to `null`)
- Zod schema: `devcon_category: z.enum(['devcon', 'she', 'kids', 'campus']).optional()`
- Passed through `createEvent` to the store

**Program colors for selected pill state:**

| Option | Selected bg | Selected text |
|--------|-------------|---------------|
| DEVCON | `#367BDD` | white |
| DEVCON Kids | `#21C45D` | white |
| #SheIsDEVCON | `#EC4899` | white |
| Campus DEVCON | `#F8C630` | slate-900 (dark text on gold) |

### Part 3: Per-event theming utility

A pure utility function `getEventThemeStyle` in `apps/member/src/lib/eventTheme.ts`:

```ts
export type DevconCategory = 'devcon' | 'she' | 'kids' | 'campus'

export function getEventThemeStyle(
  devcon_category: DevconCategory | null | undefined
): React.CSSProperties {
  // returns CSS var overrides as inline style, or {} if no program set
}
```

Returns space-separated RGB triplets matching the existing `--color-primary` / `--color-primary-dark` CSS custom property format used by the theme system:

| devcon_category | `--color-primary` | `--color-primary-dark` |
|---|---|---|
| `'devcon'` | `'54 123 221'` | `'41 98 196'` |
| `'she'` | `'236 72 153'` | `'219 39 119'` |
| `'kids'` | `'33 196 93'` | `'22 163 74'` |
| `'campus'` | `'248 198 48'` | `'234 179 8'` |
| `null` / `undefined` | — (returns `{}`) | — |

### Part 4: Apply to EventDetail and EventTicket

In both `EventDetail.tsx` and `EventTicket.tsx`:

1. Call `getEventThemeStyle(event?.devcon_category)`
2. Spread the result into `style` on the root `<div>` (or root `<motion.div>`)

```tsx
<div style={getEventThemeStyle(event.devcon_category)} className="min-h-screen bg-slate-50">
```

The inline `style` overrides the `--color-primary` CSS custom property for all descendants of that element. Every `text-primary`, `bg-primary`, `border-primary` usage inside the page automatically picks up the event's program color. The user's global theme (stored in `useThemeStore`) is never read or written.

---

## Files Changed

| File | Change |
|------|--------|
| `packages/supabase/src/types.ts` | Add `devcon_category` to `Event` interface |
| `packages/supabase/src/mock/events.ts` | Add `devcon_category` to mock events |
| `apps/member/src/stores/useEventsStore.ts` | Add `devcon_category` to `CreateEventPayload` |
| `apps/member/src/lib/eventTheme.ts` | Create — pure `getEventThemeStyle` utility |
| `apps/member/src/pages/organizer/events/EventCreate.tsx` | Add DEVCON Program field to form |
| `apps/member/src/pages/events/EventDetail.tsx` | Apply `getEventThemeStyle` to root div |
| `apps/member/src/pages/events/EventTicket.tsx` | Apply `getEventThemeStyle` to root div |

---

## Out of Scope

- Organizer-facing event detail pages (no program theme applied there)
- EventRegister and EventPending pages (only B was selected: EventDetail + EventTicket)
- Dashboard event cards (cards always use the user's global theme)
- Changing the global `useThemeStore` in any way
- DB migration (handled separately when Supabase is provisioned)
