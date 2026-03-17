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

> **Note on `super_admin`:** `ORGANIZER_ROLES` in `useAuthStore` includes `super_admin`, so `isOrganizerSession` will be `true` for super admins and they will land on `/organizer`. Routing them to `/admin` instead is intentionally out of scope for MVP — they can navigate to `/admin` manually.

### Why no extra waiting is needed

`App.tsx` renders a full-screen loading spinner until `isInitialized` is `true`, which only flips after `initialize()` completes (including `getSession()`, `ensureProfile()`, and `fetchChapterName()`). The RouterProvider — and therefore `SplashScreen` — cannot mount until this is done. By the time `SplashScreen`'s `useEffect` runs, the store is fully hydrated.

> **Slow-network note:** On very slow connections, `initialize()` could theoretically take longer than 2600ms. This cannot cause a problem here because `SplashScreen` is never rendered while `isInitialized` is still `false` — the router is gated. There is no race condition.

### Implementation note

The destination must be read from the store **inside the `setTimeout` callback**, not captured in a variable before the effect runs. This ensures the value is current at the moment the redirect fires, and avoids a stale-closure bug if the component ever re-renders before the timer resolves.

---

## Scope

**Single file change:** `apps/member/src/pages/auth/SplashScreen.tsx`

- Add `useAuthStore` import
- Destructure `user` and `isOrganizerSession` from the store
- Read `user` and `isOrganizerSession` from the store **inside** the `setTimeout` callback
- Replace hardcoded `'/onboarding'` with a computed path derived at callback execution time

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
