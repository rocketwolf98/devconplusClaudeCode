# CORS Fix + Chapter-Scoped Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the CORS bug blocking QR scanning edge functions, default events list to user's chapter, and add chapter-locked events with defense-in-depth enforcement.

**Architecture:** Two edge functions get their CORS handler upgraded to a whitelist Set (matching the pattern already used by `approve-at-door` and `check-rate-limit`). The events list gets a client-side default chapter filter. A new `is_chapter_locked` column on `events` controls cross-chapter registration, enforced at UI, RLS, and edge function layers.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase Postgres (RLS), React + TypeScript + Tailwind, Zustand stores

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `supabase/functions/award-points-on-scan/index.ts` | CORS whitelist fix + chapter-lock guard |
| Modify | `supabase/functions/generate-qr-token/index.ts` | CORS whitelist fix |
| Create | `supabase/migrations/20260401_add_is_chapter_locked.sql` | Schema + RLS migration |
| Modify | `packages/supabase/src/types.ts` | Add `is_chapter_locked` to Event interface |
| Modify | `packages/supabase/src/database.types.ts` | Regenerate (or manual patch) |
| Modify | `apps/member/src/pages/events/EventsList.tsx` | Default chapter filter |
| Modify | `apps/member/src/pages/events/EventDetail.tsx` | Chapter-lock registration guard |
| Modify | `apps/member/src/pages/events/EventRegister.tsx` | Chapter-lock redirect guard |
| Modify | `apps/member/src/pages/organizer/events/EventCreate.tsx` | Chapter-lock toggle |
| Modify | `apps/member/src/pages/organizer/events/EventEdit.tsx` | Chapter-lock toggle |
| Modify | `apps/member/src/stores/useEventsStore.ts` | Add `is_chapter_locked` to CreateEventPayload + UpdateEventPayload |

---

## Task 1: Fix CORS in `award-points-on-scan`

**Files:**
- Modify: `supabase/functions/award-points-on-scan/index.ts:21-32`

- [ ] **Step 1: Replace single-value CORS with whitelist Set**

In `supabase/functions/award-points-on-scan/index.ts`, replace lines 21-32:

```typescript
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN
  }
  return headers
}
```

With:

```typescript
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'https://devconplus.vercel.app',
  'https://devconplusbeta-v1.vercel.app',
])

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/award-points-on-scan/index.ts
git commit -m "fix(cors): award-points-on-scan — use origin whitelist Set instead of single value"
```

---

## Task 2: Fix CORS in `generate-qr-token`

**Files:**
- Modify: `supabase/functions/generate-qr-token/index.ts:19-29`

- [ ] **Step 1: Replace single-value CORS with whitelist Set**

In `supabase/functions/generate-qr-token/index.ts`, replace lines 19-29:

```typescript
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN
  }
  return headers
}
```

With:

```typescript
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'https://devconplus.vercel.app',
  'https://devconplusbeta-v1.vercel.app',
])

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/generate-qr-token/index.ts
git commit -m "fix(cors): generate-qr-token — use origin whitelist Set instead of single value"
```

---

## Task 3: Add `is_chapter_locked` column + RLS policy

**Files:**
- Create: `supabase/migrations/20260401_add_is_chapter_locked.sql`

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/20260401_add_is_chapter_locked.sql`:

```sql
-- Add chapter-lock column to events (DEFAULT true for new events; existing rows get NULL = unlocked)
ALTER TABLE events ADD COLUMN is_chapter_locked boolean DEFAULT true;

-- RLS policy: block cross-chapter registration for locked events.
-- Uses a subquery to check the event's lock status and chapter against the registrant's chapter.
-- NULL is_chapter_locked is treated as unlocked (backwards compat for existing events).
CREATE POLICY "Block cross-chapter registration for locked events"
  ON event_registrations
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_id
        AND e.is_chapter_locked = true
        AND e.chapter_id IS DISTINCT FROM p.chapter_id
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260401_add_is_chapter_locked.sql
git commit -m "feat(db): add is_chapter_locked column + RLS policy for chapter-locked events"
```

---

## Task 4: Update TypeScript types

**Files:**
- Modify: `packages/supabase/src/types.ts:102-127`
- Modify: `apps/member/src/stores/useEventsStore.ts:17-55`

- [ ] **Step 1: Add `is_chapter_locked` to the Event interface**

In `packages/supabase/src/types.ts`, after line 124 (`slug: string`), add:

```typescript
  is_chapter_locked: boolean | null
```

- [ ] **Step 2: Add `is_chapter_locked` to CreateEventPayload**

In `apps/member/src/stores/useEventsStore.ts`, add to the `CreateEventPayload` interface (after `requires_approval: boolean`):

```typescript
  is_chapter_locked: boolean
```

- [ ] **Step 3: Add `is_chapter_locked` to UpdateEventPayload**

In `apps/member/src/stores/useEventsStore.ts`, add to the `UpdateEventPayload` interface (after `requires_approval?: boolean`):

```typescript
  is_chapter_locked?: boolean
```

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/src/types.ts apps/member/src/stores/useEventsStore.ts
git commit -m "feat(types): add is_chapter_locked to Event interface and store payloads"
```

---

## Task 5: Default chapter filter in EventsList

**Files:**
- Modify: `apps/member/src/pages/events/EventsList.tsx:44,48-75`

- [ ] **Step 1: Initialize `selectedChapterId` from user's chapter**

In `apps/member/src/pages/events/EventsList.tsx`, change line 44 from:

```typescript
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
```

To:

```typescript
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(user?.chapter_id ?? null)
```

This uses the authenticated user's `chapter_id` (from `useAuthStore`) as the initial filter value. `user` is already destructured on line 38. If the user has no chapter (shouldn't happen but defensive), it falls back to `null` (show all).

- [ ] **Step 2: Commit**

```bash
git add apps/member/src/pages/events/EventsList.tsx
git commit -m "feat(events): default chapter filter to user's own chapter"
```

---

## Task 6: Chapter-lock guard in EventDetail

**Files:**
- Modify: `apps/member/src/pages/events/EventDetail.tsx:0-6,86-115`

- [ ] **Step 1: Import `useAuthStore`**

In `apps/member/src/pages/events/EventDetail.tsx`, add import after line 4:

```typescript
import { useAuthStore } from '../../stores/useAuthStore'
```

- [ ] **Step 2: Get user from auth store**

After line 13 (`const { events, registrations } = useEventsStore()`), add:

```typescript
  const { user } = useAuthStore()
```

- [ ] **Step 3: Add chapter-lock helper**

After the `volunteerApp` line (line 22), add:

```typescript
  const isChapterLocked = event?.is_chapter_locked === true && event.chapter_id !== user?.chapter_id
```

- [ ] **Step 4: Replace the Register CTA block**

Replace the register button block (the `{!reg ? (` branch at line 88-95):

```typescript
          {!reg ? (
            <button
              onClick={() => navigate(`/events/${slug}/register`)}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl"
            >
              Request to Join
            </button>
```

With:

```typescript
          {!reg ? (
            isChapterLocked ? (
              <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold py-4 rounded-2xl text-center text-sm">
                This event is exclusive to {events.find(e => e.id === event.id) ? 'this chapter\'s' : ''} members
              </div>
            ) : (
              <button
                onClick={() => navigate(`/events/${slug}/register`)}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl"
              >
                Request to Join
              </button>
            )
```

Note: We need to resolve the chapter name. Since we have `event.chapter_id` but not the chapter name readily available, we'll fetch it. Actually, to keep it simple and avoid an extra query, use a static message. Let me revise — we should fetch the chapter name. Add a state + effect:

After the `isChapterLocked` line, add:

```typescript
  const [eventChapterName, setEventChapterName] = useState<string | null>(null)
  useEffect(() => {
    if (isChapterLocked && event?.chapter_id) {
      supabase
        .from('chapters')
        .select('name')
        .eq('id', event.chapter_id)
        .single()
        .then(({ data }) => setEventChapterName(data?.name ?? null))
    }
  }, [isChapterLocked, event?.chapter_id])
```

Add imports at the top:

```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
```

Update the `useEffect` import on line 0 to include `useState`:

```typescript
import { useEffect, useState } from 'react'
```

Then the lock message becomes:

```typescript
              <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold py-4 rounded-2xl text-center text-sm">
                This event is exclusive to {eventChapterName ?? 'this chapter\'s'} members
              </div>
```

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/events/EventDetail.tsx
git commit -m "feat(events): show chapter-lock notice instead of register button for locked events"
```

---

## Task 7: Chapter-lock redirect guard in EventRegister

**Files:**
- Modify: `apps/member/src/pages/events/EventRegister.tsx:0-17`

- [ ] **Step 1: Add chapter-lock guard**

In `apps/member/src/pages/events/EventRegister.tsx`, after line 17 (`if (!event || !user) return null`), add:

```typescript
  // Block cross-chapter registration for locked events
  if (event.is_chapter_locked === true && event.chapter_id !== user.chapter_id) {
    navigate(`/events/${slug}`, { replace: true })
    return null
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/member/src/pages/events/EventRegister.tsx
git commit -m "feat(events): redirect to detail if user tries to register for a chapter-locked event"
```

---

## Task 8: Chapter-lock toggle in EventCreate

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventCreate.tsx:471-490`

- [ ] **Step 1: Add `is_chapter_locked` to the form schema**

Find the Zod schema in EventCreate.tsx (search for `z.object`). Add to the schema:

```typescript
  is_chapter_locked: z.boolean(),
```

And in the `useForm` `defaultValues`, add:

```typescript
  is_chapter_locked: true,
```

- [ ] **Step 2: Add the toggle UI after the "Require Registration Approval" toggle**

After the closing `</div>` of the requires_approval toggle block (around line 490), add:

```typescript
            {/* Chapter lock toggle */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
              <input
                {...register('is_chapter_locked')}
                type="checkbox"
                id="is_chapter_locked"
                className="w-4 h-4 accent-blue rounded"
              />
              <div>
                <label
                  htmlFor="is_chapter_locked"
                  className="text-sm font-semibold text-slate-900 cursor-pointer"
                >
                  Lock to Chapter
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only members of your chapter can register for this event. Disable to allow members from any chapter to join.
                </p>
              </div>
            </div>
```

- [ ] **Step 3: Include `is_chapter_locked` in the submit payload**

Find where `createEvent` is called in the `onSubmit` handler. Ensure `is_chapter_locked` is included in the payload passed to `createEvent()`. It should already be included if the form data spreads into the payload. Verify the form data mapping includes it.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventCreate.tsx
git commit -m "feat(events): add chapter-lock toggle to event creation form (default ON)"
```

---

## Task 9: Chapter-lock toggle in EventEdit

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventEdit.tsx:448-501`

- [ ] **Step 1: Add `is_chapter_locked` to the form schema**

Find the Zod schema in EventEdit.tsx. Add:

```typescript
  is_chapter_locked: z.boolean(),
```

In the `useForm` `defaultValues` (populated from the existing event), add:

```typescript
  is_chapter_locked: event.is_chapter_locked ?? false,
```

Note: `?? false` because existing events have `NULL` (treated as unlocked).

- [ ] **Step 2: Add the toggle UI after the requires_approval section**

After the closing `</div>` of the requires_approval section (around line 501), add the same toggle block as Task 8:

```typescript
            {/* Chapter lock toggle */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
              <input
                {...register('is_chapter_locked')}
                type="checkbox"
                id="is_chapter_locked"
                className="w-4 h-4 accent-blue rounded"
              />
              <div>
                <label
                  htmlFor="is_chapter_locked"
                  className="text-sm font-semibold text-slate-900 cursor-pointer"
                >
                  Lock to Chapter
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only members of your chapter can register for this event. Disable to allow members from any chapter to join.
                </p>
              </div>
            </div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventEdit.tsx
git commit -m "feat(events): add chapter-lock toggle to event edit form"
```

---

## Task 10: Chapter-lock enforcement in `award-points-on-scan`

**Files:**
- Modify: `supabase/functions/award-points-on-scan/index.ts:147-178`

- [ ] **Step 1: Add `is_chapter_locked` to the event SELECT**

In the event query (around line 149), change:

```typescript
      .select('id, title, points_value, chapter_id')
```

To:

```typescript
      .select('id, title, points_value, chapter_id, is_chapter_locked')
```

- [ ] **Step 2: Add member chapter lookup**

After the member name query (around line 181-185), extend it to also fetch `chapter_id`:

Change:

```typescript
    const { data: member } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', reg.user_id)
      .single()
```

To:

```typescript
    const { data: member } = await supabase
      .from('profiles')
      .select('full_name, chapter_id')
      .eq('id', reg.user_id)
      .single()
```

- [ ] **Step 3: Add chapter-lock check after the existing chapter-scope check**

After the existing chapter scoping block (line 178), add:

```typescript
    // 5c. Chapter-lock enforcement: if the event is locked to its chapter,
    //     reject check-in for members from other chapters.
    if (
      event.is_chapter_locked === true &&
      member?.chapter_id &&
      event.chapter_id !== member.chapter_id
    ) {
      logger.warn('qr_scan_chapter_locked', {
        member_id: reg.user_id,
        member_chapter: member.chapter_id,
        event_chapter: event.chapter_id,
        event_id: event.id,
      })
      return new Response(
        JSON.stringify({ success: false, error: 'This event is locked to its home chapter.' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
```

Note: This check must come AFTER the member query (step 2) since it needs `member.chapter_id`. Reorder if needed — move the member query before this check.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/award-points-on-scan/index.ts
git commit -m "feat(security): enforce chapter-lock in award-points-on-scan edge function"
```

---

## Task 11: Regenerate database types

**Files:**
- Modify: `packages/supabase/src/database.types.ts`

- [ ] **Step 1: Apply migration to live DB**

Run the migration against the live Supabase project (via SQL editor or `supabase db push`):

```bash
supabase db push
```

Or apply via the Supabase SQL editor by pasting the contents of `supabase/migrations/20260401_add_is_chapter_locked.sql`.

- [ ] **Step 2: Regenerate types**

```bash
npx supabase gen types typescript --project-id <project-ref> > packages/supabase/src/database.types.ts
```

Verify `is_chapter_locked` appears in the events Row/Insert/Update types.

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/src/database.types.ts
git commit -m "chore(types): regenerate database.types.ts with is_chapter_locked column"
```

---

## Task 12: Deploy edge functions

- [ ] **Step 1: Deploy updated edge functions**

```bash
supabase functions deploy award-points-on-scan
supabase functions deploy generate-qr-token
```

- [ ] **Step 2: Verify CORS works from production**

Open `https://devconplus.vercel.app`, navigate to an event ticket, and verify the QR code generates without CORS errors in the browser console.

- [ ] **Step 3: Verify QR scanning works**

Open the organizer scan page, scan a test QR code, and confirm the check-in flow completes with a success overlay.
