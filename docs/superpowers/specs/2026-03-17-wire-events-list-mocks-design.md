# Spec: Wire EventsList Mock Data to Real Supabase

**Date:** 2026-03-17
**Status:** Approved
**Scope:** `apps/member/src/pages/events/EventsList.tsx` only

---

## Problem

`EventsList.tsx` has two remaining mock data dependencies:

1. **`MOCK_CHAPTERS`** — imported from `@devcon-plus/supabase`, used to seed the chapter filter bottom sheet while a real fetch runs in the background. The component initialises with mock data and falls back to it on error.
2. **`MOCK_ATTENDEES`** — a hardcoded `Record<string, number>` mapping fake event IDs (`ev-1`, `ev-2`, …) to attendance numbers. Real events use UUIDs, so the map never matches and attendee counts are always blank in production.

All Zustand stores are already fully wired. This is the last remaining mock dependency in the member app.

---

## Approach: Two-Query Client-Side Merge

No migration required. All changes are local to `EventsList.tsx`.

### Chapters

The Supabase fetch already exists in `useEffect` (lines 61–69). The only changes:

- Initialise `chapters` state as `[]` instead of `MOCK_CHAPTERS`
- Remove the `CHAPTERS as MOCK_CHAPTERS` import from `@devcon-plus/supabase`
- Simplify the fetch guard: `if (!error && data)` — remove the `data.length > 0` fallback that kept mock data on empty results

**Loading behaviour:** The chapter filter sheet renders region groups from live state. While the fetch is in-flight the list is empty; the sheet can still be opened but shows only the "All Chapters" option. On fetch completion the list populates. This is acceptable for MVP.

### Attendee Counts

- Add component state: `const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({})`
- In `useEffect`, after `fetchEvents()`, fire a second query in parallel:
  ```ts
  supabase
    .from('event_registrations')
    .select('event_id')
    .eq('status', 'approved')
  ```
- Reduce results client-side — each row is one approved registration, so increment per `event_id`:
  ```ts
  const counts: Record<string, number> = {}
  data?.forEach((row) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
  })
  setAttendeeCounts(counts)
  ```
- Replace all three `MOCK_ATTENDEES[x]` references with `attendeeCounts[x]`

**Display behaviour preserved:**
- Featured hero card: always renders the attendees line; shows `0 attending` when count is absent (same as before)
- List event cards: badge only renders when `attendeeCounts[event.id]` is truthy (i.e. > 0)

**Scale:** At MVP scale (~10–100 events) fetching all approved registrations in one query and grouping client-side is negligible. A database view can replace this later if needed.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/member/src/pages/events/EventsList.tsx` | Remove `MOCK_CHAPTERS` import + `MOCK_ATTENDEES` constant; add `attendeeCounts` state; wire fetch |

---

## Out of Scope

- Adding `attendee_count` to the `events` table or creating a database view
- Caching attendee counts across navigation (component re-fetches on mount)
- Real-time attendee count updates via Supabase Realtime
