---
name: ui-visual-consistency
description: Use when writing or modifying React UI components in a design-system-driven app — catches token drift, hardcoded colors, inconsistent animation springs, wrong shadow classes, broken card patterns, and MD3 type scale misuse before they reach production
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

## Font

The app uses **Proxima Nova** (self-hosted woff2, 6 weights: 300/400/400i/600/700/900).

| Class | When to use |
|---|---|
| `font-proxima` | Explicit weight overrides, display text |
| `font-sans` | Body text (maps to Proxima Nova via Tailwind default) |

Never use `font-mono` or leave the font unspecified for UI text. Do not reference Geist — the font was migrated to Proxima Nova.

---

## The 5-Point Consistency Checklist

Run every check before marking a component done.

### 1. Colors — Token-First, Never Hardcoded

| ❌ Never | ✅ Always |
|---|---|
| `text-[#1152D4]` or `text-blue-500` | `text-primary` (theme-driven) |
| `bg-orange-500` / `bg-amber-500` | `bg-promoted` (`#F97316` — promoted badge only) |
| `text-gray-400` or `text-zinc-400` | `text-slate-400` |
| `bg-blue-50` for icon containers | `bg-primary/10` |
| Any hardcoded hex in className | Tailwind alias or CSS custom property |

**Primary vs Blue rule:**
- `text-primary` / `bg-primary` → member context (theme-driven, changes with program theme)
- `text-blue` / `bg-blue` → organizer context OR when you explicitly need the non-themed DEVCON blue (`#1152D4`)

Organizer routes do **not** apply program themes — use `text-blue` there.

**Active program themes and their primary hex values:**

| Theme | CSS class | Primary | Dark |
|---|---|---|---|
| DEVCON+ (default) | `.theme-devcon` | `#1152D4` | `#0D42AA` |
| She is DEVCON | `.theme-she` | `#BE185D` | `#9D174D` |
| DEVCON Kids | `.theme-kids` | `#059669` | `#047857` |
| Campus | `.theme-campus` | `#D97706` | `#B45309` |
| DEVCON Purple | `.theme-purple` | `#7C3AED` | `#6D28D9` |

Never hardcode these hex values — always use `bg-primary` / `text-primary`.

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
| Floating / elevated (nav pill, active CTAs) | `shadow-primary` |
| Modals, bottom sheets, frosted buttons | `shadow-lg` |
| Modal dialogs (confirmation, Konami) | `shadow-xl` |
| Standard content cards | Never `shadow-lg`, `shadow-md`, `shadow-xl` |

**Glassmorphism patterns** (for overlays and floating elements only — never for main content cards):

```tsx
// Frosted nav pill
className="bg-white/95 backdrop-blur border border-slate-100 shadow-primary"

// Frosted CTA button (e.g. on cover images)
className="bg-white/20 backdrop-blur-md shadow-lg border border-white/30"

// Header glassmorphism
className="backdrop-blur-md bg-slate-50/80"
```

> **`overflow-hidden` + badge:** When a card has `overflow-hidden`, the `PromotedBadge` wrapper **must** have `z-10`. Without it the badge clips. JobCard-style cards (no `overflow-hidden`) don't need it — but add it anyway for safety.

### 3. Animation — Standard Spring Values

| Context | `whileTap` | `stiffness` | `damping` |
|---|---|---|---|
| Card (full card tap area) | `scale: 0.97` | `400` | `25` |
| Button / small control | `scale: 0.95` | `400` | `25` |
| Nav item | `scale: 0.88` | `400` | `20` |
| Nav tab indicator | — | `380` | `28` (use `NAV_SPRING`) |

Always `type: 'spring'`. Never `duration`-based transitions on interactive elements.

**All named variants must be imported from `lib/animation` — never redefined inline:**

```ts
import {
  fadeUp,        // page entrances, card list entry
  fade,          // page-level opacity transitions
  slideUp,       // bottom sheets and modals
  backdrop,      // backdrop fade-in
  staggerContainer, // parent for staggered child lists
  cardItem,      // individual staggered card/list item
  NAV_SPRING,    // spring config for nav tab indicator
} from '../lib/animation'
```

List sections — staggered entry:
```tsx
// Parent
<motion.div variants={staggerContainer} initial="hidden" animate="visible">
// Each child
<motion.div variants={cardItem}>
```

Note: the `animate` key is `"visible"` (not `"show"`) — match the variant keys exactly.

### 4. Icon Containers

All icons use `solar-icon-set` outline variant. Never use emoji in JSX.

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

The app uses two tiers — **MD3 (preferred for new components)** and **Legacy (existing components)**.

**MD3 type scale** (`tailwind.config.js` — additive tokens):

| Role | Class | Size |
|---|---|---|
| Hero / display | `text-md3-display-lg` | 57px |
| Page title | `text-md3-headline-lg` | 32px |
| Section / card title | `text-md3-title-lg` | 22px |
| Subheading | `text-md3-title-md` | 16px |
| Body content | `text-md3-body-md` | 14px |
| Small body | `text-md3-body-sm` | 12px |
| Chip / badge / metadata | `text-md3-label-md` | 12px |
| Tiny label | `text-md3-label-sm` | 11px |

When using MD3 scale, pair with `font-proxima` and the appropriate `font-weight`.

**Legacy scale** (backward-compatible — do not change unless reworking the component):

| Role | Classes |
|---|---|
| Card title | `font-semibold text-slate-900 text-sm leading-tight` |
| Secondary / label | `text-xs text-slate-400` |
| Timestamp | `text-xs text-slate-400` |
| Accent (pts, links) | `text-xs text-primary font-semibold` |
| Section header | `text-base font-bold text-slate-900` |
| Caption / ref | `text-[10px] text-slate-400` |

Prefer MD3 scale for any new component going forward.

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| `shadow-lg` on a flat content card | `shadow-card` |
| `bg-orange-500` on promoted badge | `bg-promoted` |
| `rounded-3xl` on a control button | Reserve for hero cards / XP card only |
| `damping: 20` on a card tap | Change to `damping: 25` |
| Promoted badge missing `z-10` inside `overflow-hidden` | Add `z-10` to badge wrapper |
| `text-blue` for member-context icon | Use `text-primary` — let theme drive color |
| Redefining spring or variant inline | Import from `lib/animation` |
| Missing `memo()` on pure display component | `export default memo(ComponentName)` |
| `bg-slate-*` or emoji for missing cover image | Use `bg-primary` + `<Icon className="w-12 h-12 text-white/20" />` |
| Inner card section uses `p-4` | Use `px-3 py-2` for nested `bg-slate-50` blocks |
| Using old blue value `#367BDD` | The blue alias is `#1152D4` — use `text-blue` / `bg-blue` |
| Hardcoded hex in glassmorphism backgrounds | Use `bg-white/20`, `bg-slate-50/80` (Tailwind opacity modifiers) |
| Using Geist font reference | Font is Proxima Nova — use `font-proxima` or `font-sans` |
| `animate="show"` on stagger containers | Use `animate="visible"` to match variant keys in `animation.ts` |

---

## Page-Level Constants

```
Page background:   bg-slate-50
Page gutters:      px-4
Safe bottom:       pb-24  (clears floating nav)
No slate-600 or slate-800 — Tailwind slate has no 600/800 steps
```
