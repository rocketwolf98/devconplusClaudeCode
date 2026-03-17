# Dashboard Scroll Header Shrink — Design Spec
**Date:** 2026-03-17
**Status:** Approved

## Overview

As the user scrolls down on the Dashboard, the sticky header compresses progressively:
- Top/bottom padding reduces
- The "Hi, {firstName}!" greeting shrinks in font size
- The logo shrinks proportionally
- The notification bell shrinks slightly

The XP card (blue cradle) simultaneously fades and collapses to zero height (already implemented). All animations are tied to the existing `scrollYMV` framer-motion value in `Dashboard.tsx`.

---

## Scroll Listener — Already Exists, Nothing to Add

`scrollYMV` is already a `useMotionValue(0)` and there is already a `useEffect` in `Dashboard.tsx` that attaches a passive scroll listener to `document.querySelector('[data-scroll-container]')`. **No new scroll listener is needed.** All new transforms simply read from `scrollYMV`.

---

## Safe-Area Note

`pt-14` (56px) in this project is **aesthetic top padding only** — nowhere in the codebase is `env(safe-area-inset-top)` used. Starting `headerPaddingTop` at `56` is correct. No `calc()` wrapper is needed.

---

## Clamping Note

framer-motion's range-mapping `useTransform(value, inputRange, outputRange)` **clamps by default** — it does not extrapolate outside the input range. Passing `{ clamp: true }` is not a valid option for this overload. Simply omit any options object; overscroll protection is already built in.

---

## Units Note

`useTransform` with numeric output ranges (e.g., `[56, 16]`) produces a `MotionValue<number>`. When assigned to `style={{ paddingTop }}`, `style={{ fontSize }}`, `style={{ height }}`, or `style={{ width }}` on a `motion.*` element, React/framer-motion automatically appends `"px"`. No manual unit strings needed.

---

## Initial Render Note

`scrollYMV` starts at `0`, so all derived `MotionValue`s resolve to their `[0]` output value synchronously on first render. There is no flash of unsized elements.

---

## Scroll Ranges

| Range (scrollTop px) | Effect |
|---|---|
| `0 → 80` | Header shrinks (new) |
| `0 → 110` | Cradle opacity fades (existing) |
| `60 → 180` | Cradle height collapses to 0 (existing) |

---

## New `useTransform` Declarations

Add these 5 lines after the existing `gradientOpacity` declaration:

```ts
const headerPaddingTop    = useTransform(scrollYMV, [0, 80], [56, 16])
const headerPaddingBottom = useTransform(scrollYMV, [0, 80], [16, 8])
const greetingFontSize    = useTransform(scrollYMV, [0, 80], [30, 18])
const logoHeight          = useTransform(scrollYMV, [0, 80], [32, 22])
const bellSize            = useTransform(scrollYMV, [0, 80], [36, 28])
```

`bellIconSize` is **not needed** — the `Bell` icon stays at 18px. A 28px button with an 18px icon (5px padding each side) is visually correct at the collapsed size.

---

## Exact JSX Changes — `Dashboard.tsx` only

### Header wrapper

```tsx
// Before
<div className="bg-primary px-6 pt-14 pb-4">

// After — remove pt-14 pb-4; add motion + style
<motion.div className="bg-primary px-6" style={{ paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom }}>
```

Close tag changes from `</div>` to `</motion.div>`.

### Greeting

```tsx
// Before
<h1 className="text-white text-3xl font-black">Hi, {firstName}!</h1>

// After — remove text-3xl; add motion + style; fix lineHeight to prevent jump
<motion.h1
  className="text-white font-black"
  style={{ fontSize: greetingFontSize, lineHeight: 1.1 }}
>
  Hi, {firstName}!
</motion.h1>
```

`lineHeight: 1.1` is a fixed inline style (not a MotionValue) — it replaces the Tailwind `leading-*` that `text-3xl` provided, preventing a visual line-height jump when the Tailwind class is removed.

### Logo

```tsx
// Before
<img src={logoMark} alt="DEVCON+" className="h-8 w-auto" />

// After — remove h-8; add motion + style
<motion.img src={logoMark} alt="DEVCON+" className="w-auto" style={{ height: logoHeight }} />
```

### Bell button — full replacement

Preserve all existing classes except `w-9 h-9`. The `relative` class **must be kept** (required for badge absolute positioning).

```tsx
// Before
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

// After — w-9 h-9 removed; motion.button with style width/height; all other classes kept
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

The `Bell` icon stays at a fixed `w-[18px] h-[18px]`. At the collapsed bell size of 28px, the 18px icon has 5px padding on each side — visually correct. The badge `absolute -top-1 -right-1` stays anchored to the button's top-right because `relative` is preserved.

---

## What Does Not Change

- Outer wrapper: `sticky top-0 z-40 relative` — unchanged
- Gradient tail overlay (`motion.div` using `gradientOpacity`) — unchanged
- Horizontal `px-6` padding on header — unchanged
- Cradle/XP card collapse (`cradleOpacity`, `cradleHeight`) — unchanged
- No new files, no new stores, no new components
- No TypeScript `any` types
