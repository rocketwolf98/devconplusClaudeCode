# 0002 — Migrate Member App from Expo to React + Vite PWA

- **Date:** 2026-02-27
- **Status:** Accepted
- **Deciders:** Kenshin, Kien
- **Reference:** [`docs/plans/2026-02-27-member-vite-migration-design.md`](../plans/2026-02-27-member-vite-migration-design.md)

---

## Context

The initial `apps/member/` was built with **React Native (Expo)**. As the project matured, two blockers emerged:

1. **No App Store deployment.** DEVCON+ is accessed via URL on members' phones during events. There is no requirement to ship to the App Store or Google Play — making the native runtime overhead of Expo unnecessary.
2. **Teammate friction.** `expo install`, Metro bundler, and NativeWind v4 added onboarding complexity. The organizer app already used React + Vite. Aligning the two apps on the same stack removes a cognitive split.

The organizer app (`apps/organizer/`) was already a React + Vite web app deployed on Vercel, which proved the stack was viable for this use case.

---

## Decision

Migrate `apps/member/` from **React Native (Expo)** to **React 19 + Vite 7**, deployed as a **Progressive Web App (PWA)** on Vercel.

Key changes:
- **Bundler:** Metro → Vite
- **Router:** Expo Router v3 (file-based) → React Router DOM v7 (flat `createBrowserRouter`)
- **Styling:** NativeWind v4 → Tailwind CSS v3
- **Components:** React Native primitives (`<View>`, `<Text>`) → HTML + Tailwind
- **QR display:** `react-native-qrcode-svg` → `qrcode.react`
- **Migration strategy:** Big Bang (full rewrite, not incremental), because the app was early-stage and incremental migration would have left NativeWind and Tailwind co-existing.

All **Zustand stores** remained unchanged — they were already browser-compatible.
The **shared `packages/supabase/`** package was not touched.

---

## Consequences

**Easier:**
- Single `npm install` for both apps — no Expo CLI, no Metro, no NativeWind.
- Vercel deployment is identical for member and organizer (same `tsc -b && vite build` command).
- PWA manifest + `apple-touch-icon` gives an "Add to Home Screen" UX without App Store submission.
- Full access to browser APIs (e.g. `navigator.locks` for Supabase auth, `@zxing/browser` for QR scanning).

**Harder:**
- The app is a web app, not a native app. Native platform features (push notifications, background sync) require web equivalents or are deferred.
- The 390px-wide mobile viewport assumption must be strictly enforced — there's no native layout engine to catch mistakes.
- `solar-icon-set` does not support `currentColor`, requiring explicit `color` props on all icons (documented in `.claude/rules/solar-icon-styling.md`).

**Trade-off accepted:**
- We lose true native rendering. We accept this because DEVCON+ is used during events (not always-on), the PWA UX is sufficient for the use case, and the reduced complexity allows the small intern team to ship faster.
