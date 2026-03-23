---
name: ui-visual-consistency
description: Use when writing or modifying React UI components in a design-system-driven app — catches token drift, hardcoded colors, inconsistent animation springs, wrong shadow classes, and broken card patterns before they reach production
---

# UI Visual Consistency

## Overview
Design system tokens must be used **everywhere** — no hardcoded hex, no one-off spacing, no ad-hoc shadows. Inconsistency accumulates silently: every `shadow-lg` that should be `shadow-card`, every `bg-orange-500` that should be `bg-promoted`, every missing `z-10` on a badge inside `overflow-hidden` is a future visual regression.

## When to Use
- Writing any new component
- Modifying an existing component
- Before committing UI changes
- When a component "looks slightly off" but you can't identify why

When NOT to use:
- Pure logic/store changes with no JSX
- Non-visual TypeScript types or utilities

---

## The 5-Point Consistency Checklist

Run every check before marking a component done.

### 1. Colors — Token-First, Never Hardcoded

| ❌ Never | ✅ Always |
|---|---|
| `text-[#367BDD]` or `text-blue-500` | `text-primary` (theme-driven) |
| `bg-orange-500` / `bg-amber-500` | `bg-promoted` (`#F97316` — promoted badge only) |
| `text-gray-400` or `text-zinc-400` | `text-slate-400` |
| `bg-blue-50` for icon containers | `bg-primary/10` |
| Any hardcoded hex | Tailwind alias or CSS custom property |

**Primary vs Blue rule:**
- `text-primary` / `bg-primary` → member context (theme-driven, changes with program theme)
- `text-blue` / `bg-blue` → organizer context OR when you explicitly need the non-themed DEVCON blue

Organizer routes do **not** apply program themes — use `text-blue` there.

### 2. Cards — Shape + Shadow + Padding

All content cards:
```tsx
className="bg-white rounded-2xl shadow-card p-4 text-left relative"
```

Inner info blocks / grouped rows:
```tsx
className="bg-slate-50 rounded-xl px-3 py-2"
```

Shadow selection:
| Use case | Shadow class |
|---|---|
| Flat content card | `shadow-card` |
| Floating / elevated (nav, CTAs) | `shadow-primary` |
| Never on cards | `shadow-lg`, `shadow-md`, `shadow-xl` |

> **`overflow-hidden` + badge:** When a card has `overflow-hidden`, the `PromotedBadge` wrapper **must** have `z-10`. Without it the badge clips. JobCard-style cards (no `overflow-hidden`) don't need it — but add it anyway for safety.

### 3. Animation — Standard Spring Values

| Context | `whileTap` | `damping` |
|---|---|---|
| Card (full card tap area) | `scale: 0.97` | `25` |
| Button / small control | `scale: 0.95` | `25` |
| Nav item | `scale: 0.88` | `20` |

Always `type: 'spring', stiffness: 400`. Never `duration`-based transitions on interactive elements.

List sections — staggered entry:
```tsx
// Parent
<motion.div variants={staggerContainer} initial="hidden" animate="show">
// Each child
<motion.div variants={cardItem}>
```

Import `staggerContainer` and `cardItem` from `../lib/animation` — do not redefine inline.

### 4. Icon Containers

Themed icon badge (most components):
```tsx
<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
  <Icon className="w-5 h-5 text-primary" />
</div>
```

Avatar / initials circle:
```tsx
<div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center text-blue text-sm font-bold shrink-0">
  {initials}
</div>
```

Placeholder icon on `bg-primary` cover:
```tsx
<div className="w-full h-36 bg-primary flex items-center justify-center">
  <Icon className="w-12 h-12 text-white/20" />
</div>
```

### 5. Typography Scale

| Role | Classes |
|---|---|
| Card title | `font-semibold text-slate-900 text-sm leading-tight` |
| Secondary / label | `text-xs text-slate-400` |
| Timestamp | `text-xs text-slate-400` |
| Accent (pts, links) | `text-xs text-primary font-semibold` |
| Section header | `text-base font-bold text-slate-900` |
| Caption / ref | `text-[10px] text-slate-400` |

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| `shadow-lg` on a card | `shadow-card` |
| `bg-orange-500` on promoted badge | `bg-promoted` |
| `rounded-3xl` on a control button | Reserve for hero cards / XP card only |
| `damping: 20` on a card tap | Change to `damping: 25` |
| Promoted badge missing `z-10` inside `overflow-hidden` | Add `z-10` to badge wrapper |
| `text-blue` for member-context icon | Use `text-primary` — let theme drive color |
| Redefining spring inline | Import from `lib/animation` |
| Missing `memo()` on pure display component | `export default memo(ComponentName)` |
| `bg-slate-*` or emoji for missing cover image | Use `bg-primary` + `<Icon className="w-12 h-12 text-white/20" />` |
| Inner card section uses `p-4` | Use `px-3 py-2` for nested `bg-slate-50` blocks |

---

## Page-Level Constants

```
Page background:   bg-slate-50
Page gutters:      px-4
Safe bottom:       pb-24  (clears floating nav)
No slate-600 or slate-800 — Tailwind slate has no 600/800 steps
```
