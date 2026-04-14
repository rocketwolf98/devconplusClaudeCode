---
title: Member UI Theming — Hardcoded Color Sweep
date: 2026-04-14
status: approved
---

# Member UI Theming — Hardcoded Color Sweep

## Problem

The app has a working program theme system (`--color-primary` CSS custom properties, Tailwind `bg-primary` / `text-primary` utilities, theme stored in Zustand and persisted to localStorage). However, most member-facing screens and shared components bypass this system by using hardcoded Tailwind arbitrary values (`bg-[#1152d4]`, `text-[#1152d4]`) or inline `color="#1152D4"` props on Solar icons. When a user selects She, Kids, Campus, or Elite Purple themes, these elements stay DEVCON blue and the theme has no visible effect.

Additionally, the She, Kids, and Campus theme colors were adjusted in a prerequisite step (also 2026-04-14) to improve contrast and reduce visual intensity:
- She: `#EC4899` → `#BE185D` (pink-700)
- Kids: `#21C45D` → `#059669` (emerald-600)
- Campus: `#F8C630` → `#D97706` (amber-600)

These were applied to `useThemeStore.ts`, `index.css`, and `eventTheme.ts`.

## Goal

Replace all hardcoded primary-color values in member-facing pages and shared components with the appropriate CSS custom property tokens, so that switching themes produces a consistent visual change across the entire member UI.

## Scope

### In scope
- Member pages (routes under `MemberLayout`)
- Shared components used by member pages

### Out of scope
- Auth screens (`/sign-in`, `/sign-up`, `/onboarding`, etc.) — intentionally fixed
- Organizer pages (`/organizer/*`) — CLAUDE.md explicitly states organizer routes do not apply program themes
- Admin pages (`/admin/*`) — same reason
- The splash/loading screen in `App.tsx` — renders before theme is read from storage, must stay blue

## Token Mapping

Every substitution follows this table. Nothing outside these patterns is changed.

| Hardcoded form | Replacement |
|---|---|
| `bg-[#1152d4]` | `bg-primary` |
| `text-[#1152d4]` | `text-primary` |
| `bg-[#1152d4]/10` | `bg-primary/10` |
| `bg-[#1152d4]/20` | `bg-primary/20` |
| `color="#1152D4"` / `color="#1152d4"` (Solar icon prop) | `color="rgb(var(--color-primary))"` |
| `focus:border-[#1152d4]` | `focus:border-primary` |
| `focus:ring-[#1152d4]/20` | `focus:ring-primary/20` |
| inline `backgroundColor: '#1152d4'` | `backgroundColor: 'rgb(var(--color-primary))'` |
| inline `color: '#1152d4'` | `color: 'rgb(var(--color-primary))'` |

## Colors That Must Stay Hardcoded

These are intentionally fixed and must not be changed:

| Color | Value | Used for |
|---|---|---|
| Gold | `#F8C630` | Star icon fill, XP progress bar |
| Promoted orange | `#F97316` | PromotedBadge only (design mandate) |
| Error red | `#EF4444` | Error states, sign out button |
| Success green | `#21C45D` | Success states (distinct from Kids theme green) |
| Organizer blue | `#367BDD` / `bg-blue` | Organizer sidebar, nav — never themed |

## Files to Update

### Shared Components (10 files)
- `components/XPCard.tsx` — CTA button bg
- `components/EventCard.tsx` — register button bg
- `components/JobCard.tsx` — company avatar placeholder bg
- `components/SwipeButton.tsx` — track bg, thumb bg, label text
- `components/Skeleton.tsx` — avatar skeleton tint
- `components/VolunteerXpCard.tsx` — header bg, CTA button bg
- `components/SendAnnouncementSheet.tsx` — icon color prop
- `components/ProfileExpCard.tsx` — check for hardcoded blue
- `components/AnimatedDice.tsx` — check for hardcoded blue
- `components/KonamiModal.tsx` — icon color prop (Easter egg, still needs token)

### Member Pages (12 files)
- `pages/points/Points.tsx` — header bg, progress bar, tab active/inactive, icon color
- `pages/points/PointsHistory.tsx` — header bg, icon color, tab active/inactive
- `pages/events/EventsList.tsx` — header bg, icon colors, tab active/inactive, ticket count chip
- `pages/events/EventDetail.tsx` — cover image fallback bg
- `pages/events/EventRegister.tsx` — header bg, any inline colors
- `pages/events/EventVolunteer.tsx` — header bg
- `pages/jobs/JobsList.tsx` — header bg, company avatar, buttons, filter chips, apply button, focus ring
- `pages/jobs/JobDetail.tsx` — header bg
- `pages/profile/ProfileEdit.tsx` — header bg
- `pages/profile/Notifications.tsx` — header bg
- `pages/profile/Privacy.tsx` — header bg
- `pages/profile/MyQR.tsx` — header bg (already uses CSS var elsewhere in file)

## Approach

File-by-file: read each file, identify every hardcoded primary-color usage, apply the token mapping from the table above, write. Each file is reviewed in context so intentionally-fixed colors (gold, orange, red) are left alone.

No mechanical regex across all files — each replacement is semantic.

## Verification

After all files are updated:
1. Run `npm run typecheck` — no TypeScript errors introduced
2. Manually switch through all 5 themes in Profile and verify header bars, buttons, icons, tabs all change color on: Dashboard, Events, Jobs, Points, Rewards, Profile sub-pages
3. Confirm gold star, promoted badge, error states remain unchanged regardless of theme
