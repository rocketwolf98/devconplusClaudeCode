# Member UI Theming — Hardcoded Color Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded `#1152d4` primary-color values in member-facing pages and shared components with CSS custom property tokens so program theme switching works across the full member UI.

**Architecture:** Pure token substitution — no logic changes. Every `bg-[#1152d4]` → `bg-primary`, `text-[#1152d4]` → `text-primary`, `color="#1152D4"` Solar icon prop → `color="rgb(var(--color-primary))"`. Gold (`#eab308`/`#F8C630`), orange (`#F97316`), red (`#EF4444`), and organizer blue (`#367BDD`) are left untouched.

**Tech Stack:** React 19, Tailwind CSS v3, CSS custom properties (`--color-primary`), solar-icon-set

---

## Files Modified

- `apps/member/src/components/XPCard.tsx` — CTA button
- `apps/member/src/components/EventCard.tsx` — Register button
- `apps/member/src/components/JobCard.tsx` — Company avatar placeholder
- `apps/member/src/components/SwipeButton.tsx` — Track, thumb, label text
- `apps/member/src/components/Skeleton.tsx` — Avatar skeleton tints
- `apps/member/src/components/VolunteerXpCard.tsx` — Header bg, CTA button
- `apps/member/src/components/SendAnnouncementSheet.tsx` — Icon color prop
- `apps/member/src/components/KonamiModal.tsx` — Icon color prop
- `apps/member/src/pages/points/Points.tsx` — Header bg, progress bar, tabs, icon
- `apps/member/src/pages/points/PointsHistory.tsx` — Header bg, icon, tabs
- `apps/member/src/pages/events/EventsList.tsx` — Header bg, icon colors, tabs
- `apps/member/src/pages/events/EventDetail.tsx` — Cover fallback bg
- `apps/member/src/pages/events/EventRegister.tsx` — Header bg
- `apps/member/src/pages/events/EventVolunteer.tsx` — Header bg
- `apps/member/src/pages/jobs/JobsList.tsx` — Header bg, buttons, avatar, chips, focus ring
- `apps/member/src/pages/jobs/JobDetail.tsx` — Header bg
- `apps/member/src/pages/profile/ProfileEdit.tsx` — Header bg
- `apps/member/src/pages/profile/Notifications.tsx` — Header bg
- `apps/member/src/pages/profile/Privacy.tsx` — Header bg
- `apps/member/src/pages/profile/MyQR.tsx` — Header bg

---

### Task 1: Shared components — XPCard, EventCard, JobCard

**Files:**
- Modify: `apps/member/src/components/XPCard.tsx:68`
- Modify: `apps/member/src/components/EventCard.tsx:92`
- Modify: `apps/member/src/components/JobCard.tsx:19`

- [ ] **Step 1: Update XPCard CTA button**

In `apps/member/src/components/XPCard.tsx` line 68, change:
```tsx
// Before
className="font-proxima font-semibold w-full bg-[#1152d4] text-white text-[16px] h-12 rounded-[80px]"
// After
className="font-proxima font-semibold w-full bg-primary text-white text-[16px] h-12 rounded-[80px]"
```

- [ ] **Step 2: Update EventCard Register button**

In `apps/member/src/components/EventCard.tsx` line 92, change:
```tsx
// Before
<div className="bg-[#1152d4] text-white text-[12px] font-semibold px-[18px] py-[12px] rounded-[24px] flex items-center justify-center shrink-0 leading-none shadow-sm">
// After
<div className="bg-primary text-white text-[12px] font-semibold px-[18px] py-[12px] rounded-[24px] flex items-center justify-center shrink-0 leading-none shadow-sm">
```

- [ ] **Step 3: Update JobCard company avatar placeholder**

In `apps/member/src/components/JobCard.tsx` line 19, change:
```tsx
// Before
<div className="w-12 h-12 bg-[#1152d4] rounded-full shrink-0 flex items-center justify-center">
// After
<div className="w-12 h-12 bg-primary rounded-full shrink-0 flex items-center justify-center">
```

- [ ] **Step 4: Commit**
```bash
git add apps/member/src/components/XPCard.tsx apps/member/src/components/EventCard.tsx apps/member/src/components/JobCard.tsx
git commit -m "feat: apply theme tokens to XPCard, EventCard, JobCard"
```

---

### Task 2: Shared components — SwipeButton, Skeleton, VolunteerXpCard

**Files:**
- Modify: `apps/member/src/components/SwipeButton.tsx:58,64,76`
- Modify: `apps/member/src/components/Skeleton.tsx:56,72`
- Modify: `apps/member/src/components/VolunteerXpCard.tsx:41,159`

- [ ] **Step 1: Update SwipeButton**

In `apps/member/src/components/SwipeButton.tsx`, make three changes:

Line 58 — label text:
```tsx
// Before
<p className="font-proxima font-semibold text-[#1152d4] text-[14px] z-10 select-none pointer-events-none transition-opacity duration-300">
// After
<p className="font-proxima font-semibold text-primary text-[14px] z-10 select-none pointer-events-none transition-opacity duration-300">
```

Line 64 — track background:
```tsx
// Before
className="absolute left-0 top-0 bottom-0 bg-[#1152d4]/10 rounded-[36px] z-0"
// After
className="absolute left-0 top-0 bottom-0 bg-primary/10 rounded-[36px] z-0"
```

Line 76 — thumb:
```tsx
// Before
className={`absolute left-[4px] top-[4px] size-[48px] bg-[#1152d4] rounded-full flex items-center justify-center z-20 ${disabled || isLoading || isSuccess ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
// After
className={`absolute left-[4px] top-[4px] size-[48px] bg-primary rounded-full flex items-center justify-center z-20 ${disabled || isLoading || isSuccess ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
```

- [ ] **Step 2: Update Skeleton avatar tints**

In `apps/member/src/components/Skeleton.tsx`:

Line 56:
```tsx
// Before
<div className="w-10 h-10 rounded-full bg-[#1152d4]/20 animate-pulse" />
// After
<div className="w-10 h-10 rounded-full bg-primary/20 animate-pulse" />
```

Line 72:
```tsx
// Before
<div className="w-12 h-12 rounded-full bg-[#1152d4]/20 animate-pulse shrink-0" />
// After
<div className="w-12 h-12 rounded-full bg-primary/20 animate-pulse shrink-0" />
```

- [ ] **Step 3: Update VolunteerXpCard**

In `apps/member/src/components/VolunteerXpCard.tsx`:

Line 41 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto"
```

Line 159 — CTA button:
```tsx
// Before
className="font-proxima font-semibold w-full bg-[#1152d4] text-white text-[16px] h-12 rounded-[80px]"
// After
className="font-proxima font-semibold w-full bg-primary text-white text-[16px] h-12 rounded-[80px]"
```

- [ ] **Step 4: Commit**
```bash
git add apps/member/src/components/SwipeButton.tsx apps/member/src/components/Skeleton.tsx apps/member/src/components/VolunteerXpCard.tsx
git commit -m "feat: apply theme tokens to SwipeButton, Skeleton, VolunteerXpCard"
```

---

### Task 3: Shared components — SendAnnouncementSheet, KonamiModal

**Files:**
- Modify: `apps/member/src/components/SendAnnouncementSheet.tsx:67`
- Modify: `apps/member/src/components/KonamiModal.tsx:71`

- [ ] **Step 1: Update SendAnnouncementSheet icon**

In `apps/member/src/components/SendAnnouncementSheet.tsx` line 67:
```tsx
// Before
<UserSpeakOutline className="w-4 h-4" color="#1152D4" />
// After
<UserSpeakOutline className="w-4 h-4" color="rgb(var(--color-primary))" />
```

- [ ] **Step 2: Update KonamiModal icon**

In `apps/member/src/components/KonamiModal.tsx` line 71:
```tsx
// Before
<ShieldCheckOutline className="w-7 h-7" color="#1152D4" />
// After
<ShieldCheckOutline className="w-7 h-7" color="rgb(var(--color-primary))" />
```

- [ ] **Step 3: Commit**
```bash
git add apps/member/src/components/SendAnnouncementSheet.tsx apps/member/src/components/KonamiModal.tsx
git commit -m "feat: apply theme tokens to SendAnnouncementSheet, KonamiModal"
```

---

### Task 4: Points pages

**Files:**
- Modify: `apps/member/src/pages/points/Points.tsx:71,109,129,149,150`
- Modify: `apps/member/src/pages/points/PointsHistory.tsx:94,150,178,179`

- [ ] **Step 1: Update Points.tsx**

Line 71 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[64px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[64px] pt-14"
```

Line 109 — BoltOutline icon color prop:
```tsx
// Before
<BoltOutline className="w-5 h-5" color="#1152d4" />
// After
<BoltOutline className="w-5 h-5" color="rgb(var(--color-primary))" />
```

Line 129 — lifetime progress bar fill:
```tsx
// Before
className="h-full bg-[#1152d4]"
// After
className="h-full bg-primary"
```

Lines 149–150 — tab active/inactive:
```tsx
// Before
? 'bg-[#1152d4] text-white shadow-sm'
: 'bg-[#1152d4]/10 text-[#1152d4]'
// After
? 'bg-primary text-white shadow-sm'
: 'bg-primary/10 text-primary'
```

- [ ] **Step 2: Update PointsHistory.tsx**

Line 94 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[64px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[64px] pt-14"
```

Line 150 — BoltOutline icon color prop:
```tsx
// Before
<BoltOutline className="size-5" color="#1152d4" />
// After
<BoltOutline className="size-5" color="rgb(var(--color-primary))" />
```

Lines 178–179 — tab active/inactive:
```tsx
// Before
? 'bg-[#1152d4] text-white shadow-sm'
: 'bg-[#1152d4]/10 text-[#1152d4]'
// After
? 'bg-primary text-white shadow-sm'
: 'bg-primary/10 text-primary'
```

- [ ] **Step 3: Commit**
```bash
git add apps/member/src/pages/points/Points.tsx apps/member/src/pages/points/PointsHistory.tsx
git commit -m "feat: apply theme tokens to Points, PointsHistory pages"
```

---

### Task 5: Events pages

**Files:**
- Modify: `apps/member/src/pages/events/EventsList.tsx:123,159,179,207,208,215`
- Modify: `apps/member/src/pages/events/EventDetail.tsx:78`
- Modify: `apps/member/src/pages/events/EventRegister.tsx:236`
- Modify: `apps/member/src/pages/events/EventVolunteer.tsx:23`

- [ ] **Step 1: Update EventsList.tsx**

Line 123 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[64px]"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[64px]"
```

Line 159 — MapPoint icon:
```tsx
// Before
<MapPointOutline className="size-[24px]" color="#1152d4" />
// After
<MapPointOutline className="size-[24px]" color="rgb(var(--color-primary))" />
```

Line 179 — Ticket icon:
```tsx
// Before
<TicketOutline className="size-[24px]" color="#1152d4" />
// After
<TicketOutline className="size-[24px]" color="rgb(var(--color-primary))" />
```

Lines 207–208 — category tab active/inactive:
```tsx
// Before
? 'bg-[#1152d4] text-white shadow-sm'
: 'bg-[#1152d4]/10 text-[#1152d4]'
// After
? 'bg-primary text-white shadow-sm'
: 'bg-primary/10 text-primary'
```

Line 215 — ticket count chip:
```tsx
// Before
tab === 'tickets' ? 'bg-white text-[#1152d4]' : 'bg-[#1152d4]/20 text-[#1152d4]'
// After
tab === 'tickets' ? 'bg-white text-primary' : 'bg-primary/20 text-primary'
```

- [ ] **Step 2: Update EventDetail.tsx cover fallback**

Line 78 — cover image fallback bg:
```tsx
// Before
className="w-full h-full bg-[#1152d4]"
// After
className="w-full h-full bg-primary"
```

- [ ] **Step 3: Update EventRegister.tsx header**

Line 236 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
```

- [ ] **Step 4: Update EventVolunteer.tsx header**

Line 23 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
```

- [ ] **Step 5: Commit**
```bash
git add apps/member/src/pages/events/EventsList.tsx apps/member/src/pages/events/EventDetail.tsx apps/member/src/pages/events/EventRegister.tsx apps/member/src/pages/events/EventVolunteer.tsx
git commit -m "feat: apply theme tokens to Events pages"
```

---

### Task 6: Jobs pages

**Files:**
- Modify: `apps/member/src/pages/jobs/JobsList.tsx` (multiple lines)
- Modify: `apps/member/src/pages/jobs/JobDetail.tsx:45`

- [ ] **Step 1: Update JobsList.tsx**

All occurrences of `bg-[#1152d4]` → `bg-primary`, `text-[#1152d4]` → `text-primary`, `bg-[#1152d4]/10` → `bg-primary/10`, `focus:border-[#1152d4]` → `focus:border-primary`, `focus:ring-[#1152d4]/20` → `focus:ring-primary/20`.

Specific replacements:

Line 100 — company avatar:
```tsx
// Before
<div className="w-12 h-12 bg-[#1152d4] rounded-full shrink-0 flex items-center justify-center">
// After
<div className="w-12 h-12 bg-primary rounded-full shrink-0 flex items-center justify-center">
```

Line 172 — view opportunity button:
```tsx
// Before
className="flex items-center justify-center gap-2 w-full bg-[#1152d4] text-white font-bold text-sm py-3 rounded-full shadow-sm">
// After
className="flex items-center justify-center gap-2 w-full bg-primary text-white font-bold text-sm py-3 rounded-full shadow-sm">
```

Line 389 — apply button:
```tsx
// Before
className="w-full bg-[#1152d4] text-white font-bold text-sm py-3 rounded-full shadow-sm"
// After
className="w-full bg-primary text-white font-bold text-sm py-3 rounded-full shadow-sm"
```

Line 422 — filter input focus ring:
```tsx
// Before
className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 focus:outline-none focus:border-[#1152d4] focus:ring-1 focus:ring-[#1152d4]/20"
// After
className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
```

Line 438 — submit button:
```tsx
// Before
className="flex-1 py-2.5 rounded-full bg-[#1152d4] text-white text-sm font-bold disabled:opacity-50 shadow-sm"
// After
className="flex-1 py-2.5 rounded-full bg-primary text-white text-sm font-bold disabled:opacity-50 shadow-sm"
```

Line 455 — chip active state:
```tsx
// Before
: 'bg-[#1152d4] text-white'
// After
: 'bg-primary text-white'
```

Line 511 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px]"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[24px]"
```

Lines 546–547 — tab active/inactive:
```tsx
// Before
? 'bg-[#1152d4] text-white shadow-sm'
: 'bg-[#1152d4]/10 text-[#1152d4]'
// After
? 'bg-primary text-white shadow-sm'
: 'bg-primary/10 text-primary'
```

- [ ] **Step 2: Update JobDetail.tsx header**

Line 45 — header bg:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[32px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[32px] pt-14"
```

- [ ] **Step 3: Commit**
```bash
git add apps/member/src/pages/jobs/JobsList.tsx apps/member/src/pages/jobs/JobDetail.tsx
git commit -m "feat: apply theme tokens to Jobs pages"
```

---

### Task 7: Profile sub-pages

**Files:**
- Modify: `apps/member/src/pages/profile/ProfileEdit.tsx:229`
- Modify: `apps/member/src/pages/profile/Notifications.tsx:27`
- Modify: `apps/member/src/pages/profile/Privacy.tsx:38`
- Modify: `apps/member/src/pages/profile/MyQR.tsx:127`

- [ ] **Step 1: Update ProfileEdit.tsx header**

Line 229:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
```

- [ ] **Step 2: Update Notifications.tsx header**

Line 27:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
```

- [ ] **Step 3: Update Privacy.tsx header**

Line 38:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
```

- [ ] **Step 4: Update MyQR.tsx header**

Line 127:
```tsx
// Before
className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14 text-center"
// After
className="bg-primary relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14 text-center"
```

- [ ] **Step 5: Commit**
```bash
git add apps/member/src/pages/profile/ProfileEdit.tsx apps/member/src/pages/profile/Notifications.tsx apps/member/src/pages/profile/Privacy.tsx apps/member/src/pages/profile/MyQR.tsx
git commit -m "feat: apply theme tokens to Profile sub-pages"
```

---

### Task 8: Typecheck + verification

- [ ] **Step 1: Run typecheck**
```bash
npm run typecheck
```
Expected: no errors. If errors appear, they are in files touched by this plan — fix before proceeding.

- [ ] **Step 2: Start dev server and verify**
```bash
npm run dev:member
```
Open http://localhost:5173. Go to Profile → theme selector. Switch through She, Kids, Campus, Elite Purple. Verify:
- Header bars on Points, PointsHistory, EventsList, EventRegister, EventVolunteer, JobsList, JobDetail, ProfileEdit, Notifications, Privacy, MyQR all change color
- XPCard CTA button, EventCard Register button, JobCard avatar, SwipeButton thumb all change color
- Tabs (Points, Events, Jobs) active state changes color
- Gold star, promoted badge, error red remain unchanged on all themes

- [ ] **Step 3: Final commit**
```bash
git add docs/superpowers/plans/2026-04-14-member-ui-theming.md
git commit -m "docs: member UI theming implementation plan"
```
