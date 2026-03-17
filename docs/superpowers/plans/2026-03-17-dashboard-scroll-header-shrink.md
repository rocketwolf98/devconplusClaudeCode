# Dashboard Scroll Header Shrink — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate the Dashboard sticky header to progressively compress (padding + font size + logo/bell size) as the user scrolls down, tied to the existing `scrollYMV` motion value.

**Architecture:** All changes are confined to a single file (`Dashboard.tsx`). Five new `useTransform` calls derive animated values from the existing `scrollYMV`. Four JSX elements are converted to their `motion.*` equivalents with inline `style` props. No new files, stores, or components.

**Tech Stack:** React 19, framer-motion (`useTransform`, `motion.div`, `motion.h1`, `motion.img`, `motion.button`), TypeScript strict mode, Tailwind CSS v3.

---

## Chunk 1: Add transforms and update JSX

### Task 1: Add 5 `useTransform` declarations

**Files:**
- Modify: `apps/member/src/pages/dashboard/Dashboard.tsx` (lines 43–46, after existing transforms)

- [ ] **Step 1: Open the file and locate the existing transform block**

  In `apps/member/src/pages/dashboard/Dashboard.tsx`, find this block (around line 43):
  ```ts
  const scrollYMV      = useMotionValue(0)
  const cradleOpacity  = useTransform(scrollYMV, [0,  110], [1, 0])
  const cradleHeight   = useTransform(scrollYMV, [60, 180], [280, 0])
  const gradientOpacity = useTransform(scrollYMV, [30, 140], [0, 1])
  ```

- [ ] **Step 2: Add the 5 new transforms immediately after `gradientOpacity`**

  ```ts
  const headerPaddingTop    = useTransform(scrollYMV, [0, 80], [56, 16])
  const headerPaddingBottom = useTransform(scrollYMV, [0, 80], [16, 8])
  const greetingFontSize    = useTransform(scrollYMV, [0, 80], [30, 18])
  const logoHeight          = useTransform(scrollYMV, [0, 80], [32, 22])
  const bellSize            = useTransform(scrollYMV, [0, 80], [36, 28])
  ```

  No imports needed — `useTransform` is already imported.

- [ ] **Step 3: Run typecheck to confirm no errors**

  ```bash
  npm run typecheck
  ```
  Expected: no new TypeScript errors.

---

### Task 2: Convert header wrapper to `motion.div`

**Files:**
- Modify: `apps/member/src/pages/dashboard/Dashboard.tsx` (the inner `<div>` inside the sticky wrapper)

- [ ] **Step 1: Locate the header inner div (around line 94)**

  ```tsx
  <div className="bg-primary px-6 pt-14 pb-4">
  ```

- [ ] **Step 2: Replace with `motion.div`**

  Remove `pt-14 pb-4` from the className and add the `style` prop:

  ```tsx
  <motion.div
    className="bg-primary px-6"
    style={{ paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom }}
  >
  ```

  Close tag: change `</div>` → `</motion.div>` for this element.

- [ ] **Step 3: Run typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors.

---

### Task 3: Convert greeting to `motion.h1`

**Files:**
- Modify: `apps/member/src/pages/dashboard/Dashboard.tsx` (around line 99)

- [ ] **Step 1: Locate the greeting h1**

  ```tsx
  <h1 className="text-white text-3xl font-black">Hi, {firstName}!</h1>
  ```

- [ ] **Step 2: Replace with `motion.h1`**

  Remove `text-3xl`, add `style` with both `fontSize` and a fixed `lineHeight` to prevent layout jump:

  ```tsx
  <motion.h1
    className="text-white font-black"
    style={{ fontSize: greetingFontSize, lineHeight: 1.1 }}
  >
    Hi, {firstName}!
  </motion.h1>
  ```

  `lineHeight: 1.1` is a fixed value (not a MotionValue) — it replaces the implicit line-height Tailwind's `text-3xl` was providing.

- [ ] **Step 3: Run typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors.

---

### Task 4: Convert logo to `motion.img`

**Files:**
- Modify: `apps/member/src/pages/dashboard/Dashboard.tsx` (around line 98)

- [ ] **Step 1: Locate the logo img**

  ```tsx
  <img src={logoMark} alt="DEVCON+" className="h-8 w-auto" />
  ```

- [ ] **Step 2: Replace with `motion.img`**

  Remove `h-8`, add `style`:

  ```tsx
  <motion.img
    src={logoMark}
    alt="DEVCON+"
    className="w-auto"
    style={{ height: logoHeight }}
  />
  ```

- [ ] **Step 3: Run typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors.

---

### Task 5: Convert notification bell to `motion.button`

**Files:**
- Modify: `apps/member/src/pages/dashboard/Dashboard.tsx` (around lines 102–114)

- [ ] **Step 1: Locate the full bell button block**

  ```tsx
  <button
    onClick={() => navigate('/notifications')}
    className="relative w-9 h-9 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
  >
    <Bell className="w-[18px] h-[18px] text-white" />
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 min-w-[16px] h-4
                       bg-red text-white text-[9px] font-bold rounded-full
                       flex items-center justify-center px-1 leading-none">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </button>
  ```

- [ ] **Step 2: Replace with `motion.button`**

  Remove `w-9 h-9` from className. Keep `relative` (required — badge uses `absolute` positioning relative to it). Keep all other classes. Add `style`:

  ```tsx
  <motion.button
    onClick={() => navigate('/notifications')}
    className="relative bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
    style={{ width: bellSize, height: bellSize }}
  >
    <Bell className="w-[18px] h-[18px] text-white" />
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 min-w-[16px] h-4
                       bg-red text-white text-[9px] font-bold rounded-full
                       flex items-center justify-center px-1 leading-none">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </motion.button>
  ```

  The `Bell` icon stays at `w-[18px] h-[18px]` — no change needed. At the collapsed bell size of 28px, the 18px icon has 5px padding each side, which is visually correct.

- [ ] **Step 3: Run final typecheck and dev server**

  ```bash
  npm run typecheck
  ```
  Expected: zero TypeScript errors across the workspace.

  ```bash
  npm run dev:member
  ```
  Expected: dev server starts at `localhost:5173` (or similar) with no console errors.

- [ ] **Step 4: Manual visual verification**

  Open the app on a mobile viewport (390px width). Navigate to `/home`.

  Scroll down slowly and verify:
  - [ ] Header top padding compresses from ~56px to ~16px
  - [ ] "Hi, {firstName}!" shrinks from ~30px to ~18px font
  - [ ] DEVCON+ logo shrinks from 32px to 22px height
  - [ ] Notification bell shrinks from 36px to 28px
  - [ ] XP card fades and collapses (existing behavior, should be unchanged)
  - [ ] Gradient tail appears below header (existing behavior, should be unchanged)
  - [ ] Notification badge stays anchored to bell top-right at all scroll positions
  - [ ] Overscrolling (bounce) does not expand the header beyond its resting size

- [ ] **Step 5: Commit**

  ```bash
  git add apps/member/src/pages/dashboard/Dashboard.tsx
  git commit -m "feat(dashboard): animate header shrink on scroll using scrollYMV transforms"
  ```
