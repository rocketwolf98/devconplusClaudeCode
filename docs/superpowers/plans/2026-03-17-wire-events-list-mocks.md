# Wire EventsList Mock Data to Real Supabase — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `MOCK_CHAPTERS` and `MOCK_ATTENDEES` from `EventsList.tsx` and replace them with real Supabase data.

**Architecture:** Two small, independent changes to a single file. Chapters: the Supabase fetch already exists — remove the mock initialiser and simplify the guard. Attendee counts: add a parallel `event_registrations` query in the existing `useEffect`, reduce client-side into a `Record<string, number>`, and swap all three `MOCK_ATTENDEES` references.

**Tech Stack:** React 19, Supabase JS (`supabase` client from `../../lib/supabase`), TypeScript strict, Vite (no test runner — verification is `npm run typecheck` + visual check)

---

## File Map

| File | Action |
|------|--------|
| `apps/member/src/pages/events/EventsList.tsx` | Modify — remove 2 mock dependencies, add 1 state, update 1 useEffect, update 3 render references |

No new files. No store changes. No migrations.

---

## Task 1: Remove `MOCK_CHAPTERS` and wire the chapters fetch cleanly

**Files:**
- Modify: `apps/member/src/pages/events/EventsList.tsx`

Context: Line 15 imports `CHAPTERS as MOCK_CHAPTERS` from `@devcon-plus/supabase`. Line 52 seeds chapters state with it. Lines 61–69 already fetch real chapters from Supabase but keep the mock as fallback. The fix is to remove the import, initialise state as `[]`, and drop the fallback guard.

- [ ] **Step 1: Remove the `MOCK_CHAPTERS` import**

In `EventsList.tsx` line 15, remove this line entirely:
```ts
import { CHAPTERS as MOCK_CHAPTERS } from '@devcon-plus/supabase'
```
The `Chapter` type import on line 16 stays — it comes from the same package but is a type, not runtime data:
```ts
import type { Event, EventRegistration, Chapter } from '@devcon-plus/supabase'
```

- [ ] **Step 2: Change chapters initial state to empty array**

Find:
```ts
const [chapters, setChapters] = useState<Chapter[]>(MOCK_CHAPTERS)
```
Replace with:
```ts
const [chapters, setChapters] = useState<Chapter[]>([])
```

- [ ] **Step 3: Simplify the chapters fetch guard**

Find the existing fetch block in `useEffect` (currently lines 61–69):
```ts
supabase
  .from('chapters')
  .select('*')
  .order('name')
  .then(({ data, error }) => {
    if (!error && data && data.length > 0) {
      setChapters(data as Chapter[])
    }
  })
```
Replace with:
```ts
supabase
  .from('chapters')
  .select('*')
  .order('name')
  .then(({ data, error }) => {
    if (!error && data) {
      setChapters(data as Chapter[])
    }
  })
```
The `data.length > 0` guard was only there to keep mock data when Supabase returned an empty result. Without a mock fallback there is nothing to guard against — empty is valid.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```
Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/events/EventsList.tsx
git commit -m "fix(EventsList): replace MOCK_CHAPTERS with real Supabase fetch"
```

---

## Task 2: Replace `MOCK_ATTENDEES` with live approved-registration counts

**Files:**
- Modify: `apps/member/src/pages/events/EventsList.tsx`

Context: Lines 18–24 define `MOCK_ATTENDEES` with 5 hardcoded entries keyed by fake IDs (`ev-1`, `ev-2`, …). Real events use UUIDs so the map never matches in production. The fix is to fetch all approved registrations in parallel with `fetchEvents()`, count them per `event_id`, and replace the 3 reference sites.

- [ ] **Step 1: Remove the `MOCK_ATTENDEES` constant**

Remove lines 18–24 entirely:
```ts
const MOCK_ATTENDEES: Record<string, number> = {
  'ev-1': 342,
  'ev-2': 118,
  'ev-3': 87,
  'ev-4': 204,
  'ev-5': 53,
}
```

- [ ] **Step 2: Add `attendeeCounts` state**

Below the existing state declarations (after the `showChapterSheet` line), add:
```ts
const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({})
```

- [ ] **Step 3: Fetch attendee counts in `useEffect`**

The current `useEffect` body starts with:
```ts
void fetchEvents()
if (user?.id) void fetchRegistrations(user.id)
```

Update it to fire the attendee count query in parallel with the existing calls:
```ts
void fetchEvents()
if (user?.id) void fetchRegistrations(user.id)

supabase
  .from('event_registrations')
  .select('event_id')
  .eq('status', 'approved')
  .then(({ data }) => {
    const counts: Record<string, number> = {}
    data?.forEach((row) => {
      counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
    })
    setAttendeeCounts(counts)
  })
```
Note: errors are silently ignored (same pattern as the chapters fetch above). Attendee counts are a display nicety — a failed fetch just shows 0.

- [ ] **Step 4: Replace the 3 `MOCK_ATTENDEES` references**

**Reference 1** — featured hero card (always shows, defaults to 0):

Find:
```tsx
<span>{(MOCK_ATTENDEES[featuredEvent.id] ?? 0).toLocaleString()} attending</span>
```
Replace with:
```tsx
<span>{(attendeeCounts[featuredEvent.id] ?? 0).toLocaleString()} attending</span>
```

**References 2 & 3** — list event cards (badge only shows when count > 0):

Find:
```tsx
{MOCK_ATTENDEES[event.id] && (
  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
    <Users className="w-3 h-3" />
    {MOCK_ATTENDEES[event.id]}
  </span>
)}
```
Replace with:
```tsx
{attendeeCounts[event.id] && (
  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
    <Users className="w-3 h-3" />
    {attendeeCounts[event.id]}
  </span>
)}
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: `Tasks: 2 successful, 2 total` — no errors.

- [ ] **Step 6: Verify no remaining mock references**

```bash
grep -n "MOCK_" apps/member/src/pages/events/EventsList.tsx
```
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/events/EventsList.tsx
git commit -m "fix(EventsList): replace MOCK_ATTENDEES with live approved-registration counts"
```

---

## Done

After both tasks, `EventsList.tsx` has zero mock data dependencies. The member app is fully wired to real Supabase data across all pages and stores.

Run a final build to confirm nothing is broken:
```bash
npm run build
```
Expected: `✓ built in ~Xs` with no errors.
