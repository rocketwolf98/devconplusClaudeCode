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

| Score (criteria met) | Level | Bar color (hex) | Label text class |
|---|---|---|---|
| 0–1 | **Weak** | `#EF4444` | `text-red` |
| 2–3 | **Fair** | `#F8C630` | `text-slate-700` ¹ |
| 4 | **Strong** | `#21C45D` | `text-green` |

> ¹ `gold` (`#F8C630`) has insufficient contrast on white backgrounds for text. Bar segments carry the gold color; the label uses `text-slate-700` for legibility at "Fair".

**Score 0 and score 1 are visually identical.** Any non-empty password (`password.length >= 1`) causes the component to render, even if zero criteria are met. Score 0 and score 1 both resolve to Weak — 1 red segment, label "Weak". There is no zero-segment state once the component renders; the minimum visible state is always 1 red segment.

Examples:
- `"a"` → length >= 1, score 0 → **Weak** (1 red segment, no chips satisfied)
- `"password"` → score 1 (length only) → **Weak** (1 red segment)
- `"Password1"` → score 3 (length + uppercase + number) → **Fair** (2 gold segments)
- `"Password1!"` → score 4 (all criteria) → **Strong** (3 green segments)

---

## Component: `PasswordStrengthMeter`

**File:** `apps/member/src/components/PasswordStrengthMeter.tsx`

**Required imports for this new file:**
```ts
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
```

> `CheckCircle2` and `XCircle` exist in `SignUp.tsx` but are **not** available here automatically — import them explicitly in this new file.

**Props:**
```ts
interface Props {
  password: string
}
```

**Behaviour:**
- Returns `null` when `password.length === 0`
- Fully display-only — no callbacks, no form coupling

### Visual Layout

```
[segment 1][segment 2][segment 3]  Weak / Fair / Strong
✓ 8+ chars   ✗ Uppercase
✓ Number     ✗ Symbol
```

**Strength bar — 3 segments, 3 levels:**

> The bar has **3 segments** representing the **3 strength levels** (Weak / Fair / Strong). This is independent of the **4 chip criteria**. Segments represent level, not individual criteria. A score of 4 (all criteria met) activates all 3 segments — the fourth criterion does not add a fourth segment.

- 3 equal `flex-1` pill segments (`h-1.5 rounded-full`) in a `flex gap-1` row
- Each segment is a `motion.div` with both `initial` and `animate` set so framer-motion does not flash from transparent on mount:

```tsx
<motion.div
  className="flex-1 h-1.5 rounded-full"
  initial={{ backgroundColor: isActive ? HEX_COLOR : '#E2E8F0' }}
  animate={{ backgroundColor: isActive ? HEX_COLOR : '#E2E8F0' }}
  transition={{ duration: 0.25 }}
/>
```

Where `isActive` is `segmentIndex < activeCount` (0-indexed) and `HEX_COLOR` is the level's hex from the table above. Setting `initial` to the same value as `animate` prevents a flash from the browser default (transparent) on first render.

> **Raw hex is intentional.** CSS class names (e.g. `bg-red`) cannot be used in framer-motion's `animate` prop — only inline style values work. If color tokens in `tailwind.config.js` change, these hex values must be updated manually.

**Label:** `text-xs font-semibold` right-aligned next to the bar row, using the class from the table above

**Chips:** `grid grid-cols-2 gap-1 mt-2`, `text-xs`, each chip is `flex items-center gap-1`
- Satisfied: `<CheckCircle2 className="w-3 h-3 text-green" />` + `<span className="text-slate-700">{label}</span>`
- Unsatisfied: `<XCircle className="w-3 h-3 text-slate-300" />` + `<span className="text-slate-400">{label}</span>`

---

## Changes to `SignUp.tsx`

### 0. Import additions (modify existing lines — do NOT add new statements)

Find the existing React import line (it currently reads `import { useState, useCallback, useEffect } from 'react'`) and add `useRef` to it. Keep all existing names:
```ts
// Before:
import { useState, useCallback, useEffect } from 'react'
// After:
import { useState, useCallback, useEffect, useRef } from 'react'
```

Find the existing `useForm` destructure (single `useForm` call) and add `watch` to it. Do **not** call `useForm` a second time:
```ts
// Before:
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
// After:
const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

### 1. Wire `PasswordStrengthMeter`

Add this line immediately after the `useForm` destructure:
```ts
const watchedPassword = watch('password') ?? ''
```

Locate the password field section. It is an outer `<div>` that contains: a `<label>`, an inner `<div className="relative">` (holding the `<input>` and the eye-toggle `<button>`), and a `{errors.password && ...}` paragraph. The meter inserts **inside the outer `<div>`**, **after the inner `</div>` (the relative wrapper)**, and **before the error paragraph**:

```tsx
{/* Outer <div> stays open until after the meter and error */}
<div>
  <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>

  {/* Inner relative wrapper — do NOT insert meter here */}
  <div className="relative">
    <input ... />
    <button type="button" ...> ... </button>
  </div>
  {/* ↑ inner relative wrapper ends — meter goes next ↓ */}

  <PasswordStrengthMeter password={watchedPassword} />
  {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
</div>
{/* ↑ outer <div> closes after both the meter and the error paragraph */}
```

### 2. Username debounce fix

Remove the `useState` timer declaration **and** every call to `setUsernameTimer` (there is one call, `setUsernameTimer(t)`, inside the old `handleUsernameChange` body — it disappears when the whole function is replaced):
```ts
// Remove this line entirely:
const [usernameTimer, setUsernameTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
```

Add the ref:
```ts
const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

Replace `handleUsernameChange` entirely with:
```ts
const handleUsernameChange = useCallback((value: string) => {
  if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
  if (!value || value.length < 3 || !USERNAME_RE.test(value)) {
    setUsernameStatus('idle')
    return
  }
  setUsernameStatus('checking')
  usernameTimerRef.current = setTimeout(async () => {
    const available = await checkUsernameAvailable(value)
    setUsernameStatus(available ? 'available' : 'taken')
  }, 400)
}, [checkUsernameAvailable])
// setUsernameStatus is a stable React state setter — intentionally omitted from deps.
// usernameTimerRef is a ref — refs are never listed in deps.
```

Replace the username guard block in `onSubmit`:
```ts
// Before:
if (usernameStatus === 'taken') {
  setFormError('Username is already taken.')
  return
}
// After:
if (usernameStatus === 'taken' || usernameStatus === 'checking') {
  setFormError(
    usernameStatus === 'checking'
      ? 'Please wait for username check to complete.'
      : 'Username is already taken.'
  )
  return
}
```

### 3. Zod schema update

```ts
// Before:
password: z.string().min(6, 'At least 6 characters'),
// After:
password: z.string().min(8, 'At least 8 characters'),
```

`min(8)` = `>= 8`, identical to the `8+ chars` chip criterion. When violated, the Zod error surfaces via `errors.password.message` (already rendered below the password field). The submit button is not additionally disabled for Zod errors — that is intentional. The chip is the soft guide; the Zod error is the hard floor only if the user attempts to submit.

---

## What is NOT changing

- `useAuthStore.checkUsernameAvailable` — already correct, no changes needed
- The username field's live indicator (Loader2 / CheckCircle2 / XCircle) — already works
- Form submission flow, routing, or error handling beyond the username race condition fix
- No new npm dependencies — `framer-motion` and `lucide-react` are already installed

---

## Files Affected

| File | Type | Summary |
|---|---|---|
| `apps/member/src/components/PasswordStrengthMeter.tsx` | **New** | Scoring logic, segmented bar, requirement chips |
| `apps/member/src/pages/auth/SignUp.tsx` | **Modified** | Wire meter, fix timer ref, update Zod min, block on `'checking'` |
