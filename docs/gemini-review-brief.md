# Gemini CLI — Junior Designer Review Brief

> **Role:** You are the Junior Designer (second brain) to the Senior Designer (Claude Opus).
> **Task:** Independent UI/UX review of the DEVCON+ mobile web app.
> **Design Language:** Material You Expressive (M3 Expressive) — Google's 2025 design evolution.
> **Font System:** Google Sans Flex (variable font with weight, width, optical size, slant, grade, roundedness axes).

---

## Your Mission

Review the DEVCON+ frontend codebase (`apps/member/src/`) and provide your independent findings on the following areas. The Senior Designer has already completed their audit — your job is to **validate, challenge, or extend** those findings with fresh eyes.

---

## Context: What is DEVCON+?

DEVCON+ is a mobile-first web app (React + Vite + Tailwind CSS + framer-motion) for the Philippines' largest volunteer tech community — 60,000+ members, mostly young professionals and students. It handles event registration, gamified points, jobs board, and chapter management.

**Current design problem:** The UI is clean but generic. It feels like a template, not a vibrant youth tech community platform. We're adopting Material You Expressive principles to make it more alive, youthful, and distinctly DEVCON.

---

## What You Should Research

### Material You Expressive (M3 Expressive)
Before reviewing the code, familiarize yourself with:
1. **M3 Expressive motion physics** — spring-based animations with bouncy overshoot, squeeze/stretch effects
2. **M3 Expressive shapes** — 35 new shapes, squircles, shape morphing on state changes
3. **M3 Expressive typography** — larger/heavier headlines, dramatic weight contrast, Google Sans Flex
4. **M3 Expressive color** — vibrant tonal surfaces, tinted elevation (not just drop shadows), dynamic palettes
5. **M3 Expressive components** — animated nav indicators, FAB menus, button groups

**Key reference:** The M3 Expressive motion token values from the Android Material Components repo:
- `springFastSpatial`: stiffness 1400, damping 0.9
- `springDefaultSpatial`: stiffness 700, damping 0.9
- `springSlowSpatial`: stiffness 300, damping 0.9
- `springFastEffects`: stiffness 3800, damping 1.0
- `springDefaultEffects`: stiffness 1600, damping 1.0
- `springSlowEffects`: stiffness 800, damping 1.0

---

## Areas for Your Review

### 1. Card Differentiation
Look at: `EventCard.tsx`, `JobCard.tsx`, `NewsCard.tsx`
**Question:** Are these three card types visually distinct enough? They currently share identical layout (image top, text bottom), identical shadows, identical border radius, identical press animations.
**Your task:** Propose how each card type should look/feel different while remaining siblings in the same design family.

### 2. Animation & Spring Values
Look at: `apps/member/src/lib/animation.ts` and how it's consumed across pages
**Question:** The app uses the same `fadeUp` (y:10→0) enter animation on 19/34 files. Everything fades up identically. Also, 23 instances of the same spring `{stiffness: 400, damping: 25}` for press effects.
**Your task:** Propose varied enter animations per content type. Should events slide from left? Jobs from right? Should the Dashboard have a unique orchestrated entrance?

### 3. Typography Scale
Look at: `apps/member/src/index.css`, `tailwind.config.js`
**Current font:** Geist (400, 500, 600, 700 weights)
**Proposed font:** Google Sans Flex (variable, 6 axes)
**Your task:** Review our proposed type scale (in the audit doc) and evaluate whether it works on a 390px mobile viewport. Is the Display Large (36px/800) too aggressive? Should we adjust?

### 4. Tonal Surface Elevation
Look at: Card backgrounds across all pages
**Current:** Flat white cards (`bg-white`) on `bg-slate-50` page background, depth via `box-shadow` only.
**M3 Expressive approach:** Surfaces carry a subtle tint of the primary color. Elevation = more tint, not just more shadow.
**Your task:** Propose specific Tailwind classes for tonal elevation levels. How do we implement `primary/3`, `primary/5`, `primary/8` tints in a way that works with the theme system (CSS custom properties)?

### 5. Celebratory Moments
Look at: `XPCard.tsx`, `Rewards.tsx` (redemption flow), `EventTicket.tsx`, `Points.tsx`
**Current:** Points counter animates up, progress bar has shimmer. That's about it.
**Your task:** Propose celebratory animations for: earning points (QR scan), unlocking a ticket, redeeming a reward, reaching a prestige level. What would feel rewarding for a 20-something Filipino tech community member?

### 6. Navigation Feel
Look at: `MemberLayout.tsx` (bottom nav), `OrganizerLayout.tsx` (sidebar)
**Current:** Bottom nav uses color change for active state. No animated indicator.
**M3 Expressive:** Navigation bars have an animated pill indicator that slides between tabs with spring physics. Active icon scales up to ~1.15.
**Your task:** Describe the ideal nav animation behavior. Should the indicator slide? Should it morph shape? What spring values feel right?

### 7. Anything We Missed
**Your task:** Do a general pass through `apps/member/src/pages/` and `apps/member/src/components/`. Flag anything that feels:
- Generic or template-like
- Inconsistent with surrounding components
- Missing an interaction that users would expect
- Not aligned with M3 Expressive principles

---

## Key Files to Review

### Core Design Files
- `apps/member/src/index.css` — Font loading, CSS custom properties, base styles
- `apps/member/tailwind.config.js` — Color tokens, spacing, shadows, font families
- `apps/member/src/lib/animation.ts` — All shared animation variants and springs

### Layout
- `apps/member/src/components/MemberLayout.tsx` — Bottom pill nav
- `apps/member/src/components/OrganizerLayout.tsx` — Sidebar nav

### Cards & Components
- `apps/member/src/components/EventCard.tsx`
- `apps/member/src/components/JobCard.tsx`
- `apps/member/src/components/NewsCard.tsx`
- `apps/member/src/components/XPCard.tsx`
- `apps/member/src/components/StatusPill.tsx`
- `apps/member/src/components/ApprovalCard.tsx`
- `apps/member/src/components/ChipBar.tsx`

### Key Pages
- `apps/member/src/pages/dashboard/Dashboard.tsx` — First screen, most complex
- `apps/member/src/pages/events/EventsList.tsx` — Featured event + list
- `apps/member/src/pages/rewards/Rewards.tsx` — Reward grid + redemption sheet
- `apps/member/src/pages/points/Points.tsx` — XP display + earn/share
- `apps/member/src/pages/profile/Profile.tsx` — Theme selector, user info

---

## How to Structure Your Response

Please organize your findings as:

```
## 1. Card Differentiation
**Agree/Disagree with Senior:** [your stance]
**Your proposals:** [specific suggestions with Tailwind/framer-motion code snippets]

## 2. Animation & Springs
...

## 3. Typography
...

## 4. Tonal Surfaces
...

## 5. Celebrations
...

## 6. Navigation
...

## 7. Additional Findings
...
```

For each section, include:
- What you observed in the current code
- What M3 Expressive recommends
- Your specific proposal (with code snippets where helpful)
- Any disagreements with the Senior Designer's audit

---

## Important Constraints

- This is a **mobile-first web app** (390px viewport) — not Android native
- Framework: React 19 + Vite 7 + Tailwind CSS v3 + framer-motion
- The app serves 60,000+ Filipino tech community members (young, tech-savvy)
- Primary color is CSS-custom-property driven: `rgb(var(--color-primary))`
- 4 program themes exist (DEVCON blue, She is DEVCON pink, Kids green, Campus gold)
- Keep changes **on-brand** for DEVCON Philippines
- Aim for **youthful, engaging, modern** — not corporate, not childish
