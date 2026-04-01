# CORS Fix + Chapter-Scoped Events + Chapter-Locked Events

> Date: 2026-04-01
> Status: Approved

---

## 1. CORS Fix (Bug)

### Problem
All 4 edge functions (`award-points-on-scan`, `generate-qr-token`, `approve-at-door`, `check-rate-limit`) use a single-value `ALLOWED_ORIGIN` env var. When the production app at `devconplus.vercel.app` sends a request and the env var is unset (defaults to `localhost:5173`) or set to only one origin, the response has no `Access-Control-Allow-Origin` header — the browser blocks it as a CORS violation. Additionally, `Access-Control-Allow-Methods` is missing from preflight responses.

### Fix
- Replace `ALLOWED_ORIGIN` (single string) with `ALLOWED_ORIGINS` (comma-separated whitelist)
- Default whitelist when env var is unset: `http://localhost:5173,https://devconplus.vercel.app,https://devconplusbeta-v1.vercel.app`
- `getCorsHeaders(req)` checks `origin` against the parsed array, sets `Access-Control-Allow-Origin` to the matching origin (not `*`)
- Add `Access-Control-Allow-Methods: 'POST, OPTIONS'` to preflight responses
- All 4 edge functions get the same fix

---

## 2. Chapter-Scoped Event Visibility (Feature)

### Behavior
- EventsList Discover tab defaults the chapter chip filter to the current user's `chapter_id` on mount
- "All Chapters" option remains in the chip bar for cross-chapter discovery
- No changes to `fetchEvents()` or the DB query — all public events are still loaded client-side
- Organizer event list is unaffected (already scoped to officer's chapter)

### UX
```
Member opens /events
  -> Discover tab loads with their chapter pre-selected (e.g. "Cebu")
  -> They see only Cebu events
  -> Chip bar: [Cebu (selected)] [All Chapters] [Manila] [Laguna] ...
  -> Tap "All Chapters" -> see everything
```

---

## 3. Chapter-Locked Events (Feature)

### Schema
```sql
ALTER TABLE events ADD COLUMN is_chapter_locked boolean DEFAULT true;
```

- New events: `DEFAULT true` (locked by default)
- Existing events: `NULL` (treated as unlocked for backwards compatibility)

### Enforcement Layers

| Layer | Behavior |
|-------|----------|
| UI — EventDetail | If locked + user chapter != event chapter: hide Register button, show "This event is exclusive to [Chapter Name] members" |
| UI — EventRegister | Same guard — redirect to detail if locked + wrong chapter |
| RLS — event_registrations INSERT | Policy rejects insert if `is_chapter_locked = true` AND user `chapter_id != events.chapter_id` |
| Edge Function — award-points-on-scan | After fetching event, check `is_chapter_locked` + member's chapter. Reject with message if mismatch |

### Event Creation/Edit UI
- New toggle in EventCreate.tsx + EventEdit.tsx under Access Settings
- Label: "Lock to chapter"
- Default: ON (checked)
- Helper text: "Only members of your chapter can register for this event. Disable to allow members from any chapter to join."

### NULL handling
- `is_chapter_locked = true` -> locked (new events)
- `is_chapter_locked = false` -> open to all chapters
- `is_chapter_locked = NULL` -> treated as unlocked (existing events, backwards compat)
