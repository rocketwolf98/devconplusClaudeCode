# Secure Signup — Design Spec
> Date: 2026-03-17
> Status: Approved

## Overview

Enhance the DEVCON+ signup flow with two security improvements:

1. **Password strength meter** — live visual feedback with a segmented bar, strength label, and requirement chips that tick off as criteria are satisfied. Soft-nudge only (no hard block on strength level).
2. **Username debounce fix** — replace `useState` timer with `useRef` to eliminate a stale-closure bug, and block submission while a username availability check is in flight.

Username _uniqueness_ checking already exists (`checkUsernameAvailable` in `useAuthStore`). This spec hardens the existing implementation and adds the password strength feature.

---

## Password Strength Scoring

### Criteria (4 total)

| Chip label | Rule |
|---|---|
| `8+ chars` | `password.length >= 8` |
| `Uppercase` | `/[A-Z]/.test(password)` |
| `Number` | `/[0-9]/.test(password)` |
| `Symbol` | `/[^A-Za-z0-9]/.test(password)` |

### Score → Level

| Score (criteria met) | Level | Color token |
|---|---|---|
| 0–1 | **Weak** | `red` (`#EF4444`) |
| 2–3 | **Fair** | `gold` (`#F8C630`) |
| 4 | **Strong** | `green` (`#21C45D`) |

Examples:
- `"password"` — length ✓ = 1 → **Weak**
- `"Password1"` — length ✓ + uppercase ✓ + number ✓ = 3 → **Fair**
- `"Password1!"` — all 4 ✓ → **Strong**

---

## Component: `PasswordStrengthMeter`

**File:** `apps/member/src/components/PasswordStrengthMeter.tsx`

**Props:**
```ts
interface Props {
  password: string
}
```

**Behaviour:**
- Renders nothing when `password.length === 0` (hidden until user starts typing)
- Fully display-only — no callbacks, no form coupling

### Visual Layout

```
[segment][segment][segment]    Strong
✓ 8+ chars   ✓ Uppercase
✓ Number     ✗ Symbol
```

**Strength bar:**
- 3 equal pill segments (`h-1.5 rounded-full`) separated by a `gap-1` flex row
- Active segments: `bg-red` / `bg-gold` / `bg-green` based on current level
- Inactive segments: `bg-slate-200`
- Number of active segments: 1 = Weak, 2 = Fair, 3 = Strong
- Segment fill uses `framer-motion` `animate={{ width }}` for smooth transitions

**Label:** right-aligned next to the bar (`text-xs font-semibold`), colored to match the level

**Chips:** 2×2 grid, `text-xs`
- Satisfied: `CheckCircle2` icon (`text-green`) + label (`text-slate-700`)
- Unsatisfied: `XCircle` icon (`text-slate-300`) + label (`text-slate-400`)

---

## Changes to `SignUp.tsx`

### 1. Wire `PasswordStrengthMeter`
- Add `const watchedPassword = watch('password') ?? ''`
- Render `<PasswordStrengthMeter password={watchedPassword} />` between the password input and its error message

### 2. Username debounce fix
- Replace `const [usernameTimer, setUsernameTimer] = useState<ReturnType<typeof setTimeout> | null>(null)` with `const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`
- Remove `usernameTimer` from `useCallback` deps — only `checkUsernameAvailable` remains
- In `onSubmit`, block submission when `usernameStatus === 'checking'` (in addition to `'taken'`):
  ```ts
  if (usernameStatus === 'taken' || usernameStatus === 'checking') {
    setFormError('Please wait for username check to complete.')
    return
  }
  ```

### 3. Zod schema update
- `password: z.string().min(6, ...)` → `z.string().min(8, 'At least 8 characters')`

---

## What is NOT changing

- `useAuthStore.checkUsernameAvailable` — already correct, no changes needed
- The username field's live indicator (Loader2 / CheckCircle2 / XCircle) — already works
- Form submission flow, routing, or error handling beyond the username race condition fix
- No new Supabase calls — uniqueness is enforced by the existing DB unique constraint on `profiles.username`

---

## Files Affected

| File | Type | Summary |
|---|---|---|
| `apps/member/src/components/PasswordStrengthMeter.tsx` | **New** | Scoring logic, segmented bar, requirement chips |
| `apps/member/src/pages/auth/SignUp.tsx` | **Modified** | Wire meter, fix timer ref, update Zod min, block on `'checking'` |
