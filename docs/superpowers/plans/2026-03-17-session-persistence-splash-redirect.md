# Session Persistence — Auth-Aware Splash Redirect Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `SplashScreen` redirect returning users directly to their dashboard instead of always routing them through onboarding.

**Architecture:** Single file change. Read `user` and `isOrganizerSession` from `useAuthStore` inside the existing `setTimeout` callback and compute the redirect destination from auth state. No new files, stores, or components needed.

**Tech Stack:** React 19, React Router DOM v7, Zustand (`useAuthStore`)

**Spec:** `docs/superpowers/specs/2026-03-17-session-persistence-splash-redirect-design.md`

---

### Task 1: Update SplashScreen to redirect based on auth state

**Files:**
- Modify: `apps/member/src/pages/auth/SplashScreen.tsx`

**Current code (lines 1–34):**
```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoVertical from '../../assets/logos/logo-vertical.svg'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/onboarding', { replace: true }), 2600)
    return () => clearTimeout(t)
  }, [navigate])

  // ... JSX unchanged
}
```

- [ ] **Step 1: Add `useAuthStore` import and read auth state inside the callback**

Replace the file content with:

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoVertical from '../../assets/logos/logo-vertical.svg'
import { useAuthStore } from '../../stores/useAuthStore'

export default function SplashScreen() {
  const navigate = useNavigate()
  const authStore = useAuthStore

  useEffect(() => {
    const t = setTimeout(() => {
      const { user, isOrganizerSession } = authStore.getState()
      const dest = user
        ? isOrganizerSession ? '/organizer' : '/home'
        : '/onboarding'
      navigate(dest, { replace: true })
    }, 2600)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="h-screen bg-blue flex flex-col items-center justify-center">
      <motion.img
        src={logoVertical}
        alt="DEVCON+"
        className="w-32 h-auto"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      />
      <motion.p
        className="text-white/40 text-xs tracking-[0.2em] uppercase mt-6"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        Sync. Support. Succeed.
      </motion.p>
    </div>
  )
}
```

> **Why `useAuthStore.getState()` inside the callback instead of a hook?**
> Reading store state via `.getState()` inside the `setTimeout` callback is the correct Zustand pattern for reading current state at execution time from within closures (timers, event handlers). It avoids stale closure capture while keeping the `useEffect` dependency array clean.

- [ ] **Step 2: Run the dev server and verify**

```bash
npm run dev:member
```

Test the three cases:

| Scenario | Steps | Expected result |
|---|---|---|
| No session | Open `localhost:5173` in a fresh private window | Splash → `/onboarding` |
| Member session | Sign in as a member, close the tab, reopen `localhost:5173` | Splash → `/home` |
| Organizer session | Sign in as an organizer, close the tab, reopen `localhost:5173` | Splash → `/organizer` |

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/auth/SplashScreen.tsx
git commit -m "feat(auth): redirect returning users to dashboard from splash screen"
```
