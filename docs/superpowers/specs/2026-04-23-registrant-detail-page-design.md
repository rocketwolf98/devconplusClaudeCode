# Registrant Detail Page — Design Spec
_Date: 2026-04-23_

## Overview

When an organizer taps a registrant card in the Attendees list (`/organizer/events/:id/registrants`), a full-screen detail panel slides in from the right showing the participant's complete profile and custom form responses. Approve / Reject / Revert / Check-In actions are available exclusively in this detail view — the list cards become purely informational.

---

## Architecture Decision

**In-page view state, not a new route.**

`EventRegistrants.tsx` holds a `selectedRegistrant: RegistrantWithResponses | null` state variable. When set, `AnimatePresence` renders `<RegistrantDetailView>` as a full-screen absolute-positioned layer (`position: absolute, inset: 0`) that slides in from the right (`x: "100%" → 0`). The URL stays at `/organizer/events/:id/registrants`.

Rationale: all registration data (including `form_responses` and `formSchema`) is already loaded in `EventRegistrants.tsx`. A new route would require a second Supabase fetch. The view-state approach reuses the data in-memory and keeps the transition instant.

---

## Changes to Existing Components

### `ApprovalCard.tsx`

- Remove all action buttons: `onApprove`, `onReject`, `onRevert`, `onCheckIn` props are deleted.
- Remove the `readOnly` prop (now always implied).
- Add `onClick?: () => void` prop. The entire card becomes a tappable row with `cursor-pointer` and `whileTap={{ scale: 0.97 }}`.
- Add a chevron-right icon (`AltArrowRightOutline`) on the trailing edge to signal tappability.
- Status badge (`<StatusBadge />`) remains on the card.
- Checked-in indicator remains (green "Checked In" text) — it is read-only info, not an action.
- The `Registration` interface exported from `ApprovalCard.tsx` is unchanged.

### `EventRegistrants.tsx`

- Add state: `const [selectedRegistrant, setSelectedRegistrant] = useState<RegistrantWithResponses | null>(null)`.
- Pass `onClick={() => setSelectedRegistrant(reg)}` to each `<ApprovalCard />`.
- Remove `onApprove`, `onReject`, `onRevert`, `onCheckIn` props from `<ApprovalCard />`.
- Remove `handleApproveAll` button (the "Approve All Pending" bulk button) — it bypasses the detail review and is inconsistent with the new flow.
- Wrap the page root in `relative overflow-hidden` so the detail panel can overlay it absolutely.
- Add `<AnimatePresence>` wrapping `<RegistrantDetailView>` — rendered when `selectedRegistrant !== null`.
- When an action (approve/reject/revert/checkin) completes inside `RegistrantDetailView`, update the `registrants` array in place via `setRegistrants`. The `selectedRegistrant` state is also updated in place to reflect the new status — the organizer stays on the detail page.
- `FormResponsesPanel` (the accordion) is removed from the list — responses are shown in the detail view instead.

---

## New Component: `RegistrantDetailView`

Defined inline in `EventRegistrants.tsx` (not a separate file — it depends on `formSchema`, `handleApprove`, etc. which are already in scope).

### Motion

Entry: `initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}` with `transition={{ type: "spring", stiffness: 320, damping: 32 }}`. This matches the slide-in pattern used by sheets throughout the app.

The panel is `position: absolute, inset: 0, z-index: 50, bg-slate-50 overflow-y-auto`.

### Layout (top to bottom)

```
1. Sticky blue header
   - Back button (ArrowLeftOutline) → sets selectedRegistrant(null)
   - Title: registrant's first name + last initial (e.g. "Juan D.")
   - Subtitle: event title (truncated)
   - No Announce button (stays on list page)

2. Avatar hero section  (bg-white, rounded-2xl, border, shadow-card, p-5, centered)
   - Large initials circle: w-16 h-16, rounded-full, bg-blue/10, text-blue, text-2xl font-black
   - Full name (text-md3-headline-sm font-bold text-slate-900)
   - Email (text-md3-body-sm text-slate-400)
   - School / company (text-md3-body-sm text-slate-400)
   - StatusBadge (pending / approved / rejected) — updates in place after action

3. Registration info card  (bg-white, rounded-2xl, border, p-4)
   - Label: "Registered" + formatted date+time
   - If checked_in: green "Checked In" row with CheckCircleOutline icon

4. Custom form responses card  (bg-white, rounded-2xl, border, p-4)
   - Only rendered if formSchema.length > 0 && form_responses exists
   - Section title: "Registration Responses" (text-md3-label-lg font-bold text-slate-500)
     + count badge (answered/total)
   - All fields listed vertically (no accordion — full space available):
     field label (text-[10px] uppercase tracking-wide text-slate-400)
     field value (text-md3-body-md text-slate-800) or italic "No answer" (text-slate-300)
   - Divider between fields (border-t border-slate-100)

5. Action bar  (sticky bottom-0, bg-white, border-t border-slate-100, px-4 py-3, safe-area aware)
   Pending:
     [Reject button — flex-1, border, text-slate-500, hover:red]
     [Approve button — flex-1, bg-blue, text-white]
   Approved + not checked in:
     [Check In — full width, bg-green/10, text-green, border border-green/20]
   Approved + checked in:
     [Static "Checked In" indicator — no button]
   Rejected:
     [Undo — full width, bg-slate-100, text-slate-500] → reverts to pending
```

### Action behavior (all stay on detail page)

- `handleApprove(reg.id)` → updates `registrants` array + `setSelectedRegistrant(prev => prev ? {...prev, status: 'approved'} : null)`. Fires approval email (same logic as before). StatusBadge and action bar re-render to the approved state.
- `handleReject(reg.id)` → updates `registrants` array + `selectedRegistrant` status in place. Action bar switches to Undo.
- `handleRevert(reg.id)` → updates `registrants` array + `selectedRegistrant` status in place. Action bar switches back to Approve + Reject.
- `handleCheckIn(reg.id)` → updates `registrants` array + `selectedRegistrant.checked_in = true`. Action bar shows "Checked In" static indicator.

---

## What Is NOT Changed

- The Volunteers tab, volunteer approval flow — untouched.
- `SendAnnouncementSheet` — untouched.
- `FormResponsesPanel` component — remove from `EventRegistrants.tsx` (it is defined inline in that file, not a separate file; no file deletion needed).
- All Supabase queries and store logic — no changes.
- The `handleApprove` email logic — moved verbatim into the detail view's action handler.
- Filter tabs (All / Pending / Approved / Rejected) — unchanged on the list.

---

## Edge Cases

- **No custom form schema**: the form responses card is not rendered. The detail page shows only the avatar hero + registration info + action bar.
- **Back navigation while action is in flight**: the `selectedRegistrant` state update happens optimistically on success. If the Supabase call errors, nothing changes (current behavior retained).
- **Organizer returns to list**: the list reflects the updated status because `registrants` state was mutated in place while the detail was open.

---

## Files Affected

| File | Change |
|---|---|
| `apps/member/src/components/ApprovalCard.tsx` | Remove action buttons, add `onClick` + chevron |
| `apps/member/src/pages/organizer/events/EventRegistrants.tsx` | Add `selectedRegistrant` state, `RegistrantDetailView` component, remove `FormResponsesPanel` usage, remove `handleApproveAll` |
