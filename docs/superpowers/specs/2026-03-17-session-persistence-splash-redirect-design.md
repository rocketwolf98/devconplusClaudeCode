# Spec: Session Persistence — Auth-Aware Splash Redirect
**Date:** 2026-03-17
**Status:** Approved

---

## Problem

Every time a user opens the app at `/`, `SplashScreen` unconditionally redirects to `/onboarding` after 2.6 seconds. This forces the user through the full auth flow (onboarding → sign-in) even when a valid Supabase session is already stored in `localStorage`.

Supabase session persistence is already correctly configured (`persistSession: true`, `autoRefreshToken: true` in `lib/supabase.ts`), and `App.tsx` already restores the session via `initialize()` before rendering the router. The only missing piece is that `SplashScreen` ignores the restored session.

---

## Solution

Make `SplashScreen` auth-aware. After the splash animation, redirect to the correct destination based on the current auth state.

### Redirect logic

| Auth state | Destination |
|---|---|
| `user` is set + `isOrganizerSession` is true | `/organizer` |
| `user` is set + `isOrganizerSession` is false | `/home` |
| `user` is null (no session) | `/onboarding` *(unchanged)* |

### Why no extra waiting is needed

`App.tsx` blocks the entire router render behind `isInitialized`. By the time `SplashScreen` mounts, `initialize()` has already completed and `getSession()` has resolved — the auth store is fully hydrated. `SplashScreen` can read `user` synchronously from the store.

---

## Scope

**Single file change:** `apps/member/src/pages/auth/SplashScreen.tsx`

- Add `useAuthStore` import
- Destructure `user` and `isOrganizerSession` from the store
- Compute destination before the `setTimeout` fires
- Replace hardcoded `'/onboarding'` with the computed path

No other files are affected. No new components, stores, or utilities needed.

---

## Non-goals

- This spec does not change session lifetime or token expiry (Supabase handles this via `autoRefreshToken`).
- This spec does not introduce httpOnly cookie storage — `localStorage` is sufficient for this SPA.
- This spec does not skip the splash animation for returning users; the brand animation plays for everyone.

---

## Affected Files

| File | Change |
|---|---|
| `apps/member/src/pages/auth/SplashScreen.tsx` | Add auth-aware redirect logic |
