# Event Program Category + Per-Event Color Theming — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `devcon_category` field to the event creation form and apply per-event color theming to EventDetail and EventTicket based on the event's program.

**Architecture:** Add `DevconCategory` type + `devcon_category` field to the Event type. A pure utility module (`eventTheme.ts`) exposes two functions — `getEventThemeStyle` (CSS var overrides for EventDetail) and `resolveEventTheme` (hex theme resolver for EventTicket's inline gradient). The form adds an optional pill selector. No global theme state is mutated.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v3, React Hook Form v7 + Zod, Zustand v5, framer-motion

---

## File Map

| File | Action |
|------|--------|
| `packages/supabase/src/types.ts` | Modify — export `DevconCategory` type, add `devcon_category` to `Event` |
| `packages/supabase/src/mock/events.ts` | Modify — add `devcon_category` to 4 mock events |
| `apps/member/src/stores/useEventsStore.ts` | Modify — add `devcon_category` to `CreateEventPayload` |
| `apps/member/src/lib/eventTheme.ts` | Create — pure utility: `getEventThemeStyle` + `resolveEventTheme` |
| `apps/member/src/pages/organizer/events/EventCreate.tsx` | Modify — add DEVCON Program pill selector to CATEGORIZATION section |
| `apps/member/src/pages/events/EventDetail.tsx` | Modify — apply `getEventThemeStyle` to root motion.div |
| `apps/member/src/pages/events/EventTicket.tsx` | Modify — replace `theme.hex`/`theme.darkHex` with `resolveEventTheme` result |

---

## Task 1: Add `DevconCategory` type + `devcon_category` to `Event`

**Files:**
- Modify: `packages/supabase/src/types.ts`

Context: `DevconCategory` must be defined in the shared types package (not in the member app) because the `Event` interface lives there. The values `'devcon' | 'she' | 'kids' | 'campus'` match the `ThemeId` type in `useThemeStore` — but that lives in the member app, so we define an equivalent type in the shared package to avoid a backwards dependency.

- [ ] **Step 1: Add `DevconCategory` type and field to `Event`**

In `packages/supabase/src/types.ts`, after the line:
```ts
export type EventCategory =
  | 'tech_talk'
  | 'hackathon'
  | 'workshop'
  | 'brown_bag'
  | 'summit'
  | 'social'
  | 'networking'
```

Add:
```ts
export type DevconCategory = 'devcon' | 'she' | 'kids' | 'campus'
```

Then in the `Event` interface, after the `category` line:
```ts
  category: EventCategory | null
```

Add:
```ts
  devcon_category: DevconCategory | null
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors. (TypeScript will now require `devcon_category` on any `Event` literal — the mock data fix comes next.)

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/src/types.ts
git commit -m "feat(types): add DevconCategory type and devcon_category to Event"
```

---

## Task 2: Update mock events with `devcon_category`

**Files:**
- Modify: `packages/supabase/src/mock/events.ts`

Context: The `Event` interface now requires `devcon_category`. All 6 mock events need the field. Assign distinct programs to 4 of them so the per-event theming is testable for every program; leave 2 as `null`.

- [ ] **Step 1: Add `devcon_category` to all 6 mock events**

Open `packages/supabase/src/mock/events.ts`. For each event, add `devcon_category` right after the `category` field:

| Event ID | Title | `devcon_category` |
|----------|-------|-------------------|
| `ev-1` | DEVCON Summit 2026 | `'devcon'` |
| `ev-2` | Code Camp Visayas | `'campus'` |
| `ev-3` | AI/ML Workshop | `'she'` |
| `ev-4` | Hackathon: Build for Good | `null` |
| `ev-5` | DEVCON Kids: Scratch Day | `'kids'` |
| `ev-past-1` | DevTalk: Open Source | `null` |

For each event object, add the field after `category`. Example for `ev-1`:
```ts
    category: 'summit',
    devcon_category: 'devcon',
    tags: ['AI', 'Web3', 'Networking'],
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/src/mock/events.ts
git commit -m "feat(mock): add devcon_category to mock events"
```

---

## Task 3: Add `devcon_category` to `CreateEventPayload`

**Files:**
- Modify: `apps/member/src/stores/useEventsStore.ts:8-25`

Context: `CreateEventPayload` is the type passed to `createEvent`. Add `devcon_category` as optional (the form field is optional, and a `null` value is valid). Also add a comment reminding that this field requires a DB migration before working against a live Supabase instance.

- [ ] **Step 1: Update `CreateEventPayload`**

Find the `CreateEventPayload` interface (lines 8–25):
```ts
interface CreateEventPayload {
  title: string
  description: string
  location: string
  event_date: string
  end_date: string | null
  category: 'tech_talk' | 'hackathon' | 'workshop' | 'brown_bag' | 'summit' | 'social' | 'networking'
  tags: string[]
  visibility: 'public' | 'unlisted' | 'draft'
  is_free: boolean
  ticket_price_php: number
  capacity: number | null
  points_value: number
  requires_approval: boolean
  cover_image_url: string | null
  chapter_id: string
  created_by: string
}
```

Add the import at the top of the file (after existing imports):
```ts
import type { DevconCategory } from '@devcon-plus/supabase'
```

Replace the `CreateEventPayload` interface with:
```ts
interface CreateEventPayload {
  title: string
  description: string
  location: string
  event_date: string
  end_date: string | null
  category: 'tech_talk' | 'hackathon' | 'workshop' | 'brown_bag' | 'summit' | 'social' | 'networking'
  // TODO: add devcon_category column to events table before going live with Supabase
  devcon_category: DevconCategory | null
  tags: string[]
  visibility: 'public' | 'unlisted' | 'draft'
  is_free: boolean
  ticket_price_php: number
  capacity: number | null
  points_value: number
  requires_approval: boolean
  cover_image_url: string | null
  chapter_id: string
  created_by: string
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/stores/useEventsStore.ts
git commit -m "feat(store): add devcon_category to CreateEventPayload"
```

---

## Task 4: Create `eventTheme.ts` utility

**Files:**
- Create: `apps/member/src/lib/eventTheme.ts`

Context: Two pure functions. `getEventThemeStyle` returns CSS custom property overrides as an inline style object — used by EventDetail which relies on Tailwind `text-primary`/`bg-primary` classes. `resolveEventTheme` returns the full `ProgramTheme` object (with `hex`/`darkHex` fields) — used by EventTicket which has hardcoded hex values in inline gradient/background styles. CSS var values are space-separated RGB triplets matching how `--color-primary` is defined in `index.css` (e.g. `'54 123 221'` for `#367BDD`).

- [ ] **Step 1: Create `apps/member/src/lib/eventTheme.ts`**

```ts
import type React from 'react'
import { PROGRAM_THEMES } from '../stores/useThemeStore'
import type { ProgramTheme } from '../stores/useThemeStore'
import type { DevconCategory } from '@devcon-plus/supabase'

// CSS custom property overrides — for components that use Tailwind text-primary/bg-primary
const CATEGORY_CSS_VARS: Record<DevconCategory, React.CSSProperties> = {
  devcon: { '--color-primary': '54 123 221',  '--color-primary-dark': '41 98 196'  } as React.CSSProperties,
  she:    { '--color-primary': '236 72 153',  '--color-primary-dark': '219 39 119' } as React.CSSProperties,
  kids:   { '--color-primary': '33 196 93',   '--color-primary-dark': '22 163 74'  } as React.CSSProperties,
  campus: { '--color-primary': '248 198 48',  '--color-primary-dark': '234 179 8'  } as React.CSSProperties,
}

/**
 * Returns inline CSS custom property overrides for a given program category.
 * Apply to a page's root element to theme all `text-primary` / `bg-primary`
 * descendants without mutating global state.
 * Returns {} when no category is set (no override — falls through to global theme).
 */
export function getEventThemeStyle(
  devcon_category: DevconCategory | null | undefined
): React.CSSProperties {
  if (!devcon_category) return {}
  return CATEGORY_CSS_VARS[devcon_category] ?? {}
}

/**
 * Resolves the effective ProgramTheme for an event.
 * Used by components that need hex/darkHex values directly (e.g. inline gradients).
 * Falls back to the user's current global theme when no program is set.
 */
export function resolveEventTheme(
  devcon_category: DevconCategory | null | undefined,
  fallbackTheme: ProgramTheme
): ProgramTheme {
  if (!devcon_category) return fallbackTheme
  return PROGRAM_THEMES.find((t) => t.id === devcon_category) ?? fallbackTheme
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/lib/eventTheme.ts
git commit -m "feat(lib): add eventTheme utility for per-event color theming"
```

---

## Task 5: Add DEVCON Program field to EventCreate form

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventCreate.tsx`

Context: Three changes: (1) add `devcon_category` to the Zod schema as optional, (2) add `DEVCON_PROGRAM_OPTIONS` constant with per-program colors for the selected pill state, (3) add a `Controller`-based pill selector in the CATEGORIZATION section just above the CATEGORY field, (4) pass `devcon_category` to `createEvent`.

- [ ] **Step 1: Add `DevconCategory` import**

At the top of `EventCreate.tsx`, add to the existing imports:
```ts
import type { DevconCategory } from '@devcon-plus/supabase'
```

- [ ] **Step 2: Add `devcon_category` to Zod schema**

In the `schema` object, after the `category` field:
```ts
    category: z.enum([
      'tech_talk',
      'hackathon',
      'workshop',
      'brown_bag',
      'summit',
      'social',
      'networking',
    ], { required_error: 'Category is required' }),
```

Add:
```ts
    devcon_category: z.enum(['devcon', 'she', 'kids', 'campus']).optional(),
```

- [ ] **Step 3: Add `DEVCON_PROGRAM_OPTIONS` constant**

After the `CATEGORY_OPTIONS` constant, add:
```ts
const DEVCON_PROGRAM_OPTIONS: {
  value: DevconCategory
  label: string
  hex: string
  darkText?: boolean
}[] = [
  { value: 'devcon',  label: 'DEVCON',         hex: '#367BDD' },
  { value: 'she',     label: '#SheIsDEVCON',   hex: '#EC4899' },
  { value: 'kids',    label: 'DEVCON Kids',     hex: '#21C45D' },
  { value: 'campus',  label: 'Campus DEVCON',   hex: '#F8C630', darkText: true },
]
```

- [ ] **Step 4: Add the DEVCON Program pill selector to the form**

In the CATEGORIZATION section, find:
```tsx
            {/* Category radio pills */}
            <div>
              <label className={labelClass}>Category <span className="text-red normal-case">*</span></label>
```

Insert the new field **before** this block:
```tsx
            {/* DEVCON Program (optional) */}
            <div>
              <label className={labelClass}>
                DEVCON Program{' '}
                <span className="text-slate-300 normal-case font-normal">optional</span>
              </label>
              <Controller
                control={control}
                name="devcon_category"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {DEVCON_PROGRAM_OPTIONS.map((opt) => {
                      const isSelected = field.value === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(isSelected ? undefined : opt.value)}
                          style={isSelected ? { backgroundColor: opt.hex, borderColor: opt.hex } : undefined}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            isSelected
                              ? opt.darkText ? 'text-slate-900' : 'text-white'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
            </div>

```

- [ ] **Step 5: Pass `devcon_category` to `createEvent`**

In the `onSubmit` handler, find the `createEvent` call. After `category: data.category,` add:
```ts
        devcon_category:   data.devcon_category ?? null,
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventCreate.tsx
git commit -m "feat(EventCreate): add DEVCON Program category selector"
```

---

## Task 6: Apply per-event theming to EventDetail

**Files:**
- Modify: `apps/member/src/pages/events/EventDetail.tsx`

Context: EventDetail's root is a `<motion.div>` with no inline style. Adding `style={getEventThemeStyle(event.devcon_category)}` to it injects CSS custom property overrides that cascade to all children. EventDetail uses only Tailwind `text-primary`/`bg-primary`/`bg-primary/10` classes — no hardcoded hex — so this single addition themes the entire page.

- [ ] **Step 1: Import `getEventThemeStyle`**

In `EventDetail.tsx`, add to the existing imports:
```ts
import { getEventThemeStyle } from '../../lib/eventTheme'
```

- [ ] **Step 2: Apply to root motion.div**

Find the root `<motion.div>` (currently around line 21):
```tsx
  return (
    <motion.div
      className="min-h-screen bg-slate-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
```

Replace with:
```tsx
  return (
    <motion.div
      className="min-h-screen bg-slate-50"
      style={getEventThemeStyle(event.devcon_category)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/events/EventDetail.tsx
git commit -m "feat(EventDetail): apply per-event program color theme"
```

---

## Task 7: Apply per-event theming to EventTicket

**Files:**
- Modify: `apps/member/src/pages/events/EventTicket.tsx`

Context: EventTicket has two places that use `theme.hex`/`theme.darkHex` as hardcoded hex values in inline styles — the root `<div>` gradient background and the ticket header strip background. CSS var overrides won't reach these inline style values, so we resolve an `effectiveTheme` using `resolveEventTheme` and use its hex values directly. The `useThemeStore` import stays (we need the fallback user theme).

- [ ] **Step 1: Import `resolveEventTheme`**

In `EventTicket.tsx`, find the existing import from the theme store:
```ts
import { useThemeStore } from '../../stores/useThemeStore'
```

Add below it:
```ts
import { resolveEventTheme } from '../../lib/eventTheme'
```

- [ ] **Step 2: Compute `effectiveTheme`**

In `EventTicket`, find where `theme` is derived from the store (look for `const theme = activeTheme()` or similar — it's in the component body near the top).

After that line, add:
```ts
  const effectiveTheme = resolveEventTheme(event?.devcon_category, theme)
```

Note: `event` may be `undefined` at this point in the component if accessed before the early-return guard. Read the file carefully — if `effectiveTheme` is used after the `if (!event) return` guard, you can write `resolveEventTheme(event.devcon_category, theme)` (without `?.`). If it must be computed before the guard, use `event?.devcon_category`.

- [ ] **Step 3: Replace `theme.hex` / `theme.darkHex` with `effectiveTheme`**

There are two usages to replace:

**Usage 1** — Root `<div>` gradient background (line ~204):
```tsx
      style={{ background: `linear-gradient(160deg, ${theme.darkHex} 0%, ${theme.hex} 100%)` }}
```
Replace with:
```tsx
      style={{ background: `linear-gradient(160deg, ${effectiveTheme.darkHex} 0%, ${effectiveTheme.hex} 100%)` }}
```

**Usage 2** — Ticket header strip background (line ~234):
```tsx
            style={{ backgroundColor: checkedIn ? '#21C45D' : theme.hex, transition: 'background-color 0.6s ease' }}
```
Replace with:
```tsx
            style={{ backgroundColor: checkedIn ? '#21C45D' : effectiveTheme.hex, transition: 'background-color 0.6s ease' }}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 5: Verify no remaining `theme.hex` / `theme.darkHex` references**

```bash
grep -n "theme\.hex\|theme\.darkHex" apps/member/src/pages/events/EventTicket.tsx
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/member/src/pages/events/EventTicket.tsx
git commit -m "feat(EventTicket): apply per-event program color theme"
```

---

## Done

Run a final typecheck:
```bash
npm run typecheck
```

Verify manually:
- Open EventDetail for `ev-1` (DEVCON Summit) → header, points chip, and CTA button should be blue (`#367BDD`)
- Open EventDetail for `ev-3` (AI/ML Workshop, `devcon_category: 'she'`) → should be pink (`#EC4899`)
- Open EventDetail for `ev-5` (DEVCON Kids, `devcon_category: 'kids'`) → should be green (`#21C45D`)
- Open EventDetail for `ev-2` (Code Camp Visayas, `devcon_category: 'campus'`) → should be gold (`#F8C630`)
- Open EventTicket for any event → gradient background and header strip should match the event's program color
- Open EventDetail for `ev-4` (no `devcon_category`) → should use the user's current global theme color
- Change global theme in Profile → events with `devcon_category: null` should reflect the new color; events with a program set should stay on their program color
