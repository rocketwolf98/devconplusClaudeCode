# Secure Signup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live password strength meter to the signup form and fix a stale-closure bug in the username availability debounce.

**Architecture:** A new display-only `PasswordStrengthMeter` component owns all scoring and UI; `SignUp.tsx` watches the password field value and passes it down. The username debounce is fixed by moving the timer from `useState` to `useRef` so the callback never goes stale. No new dependencies required.

**Tech Stack:** React 19, TypeScript strict, React Hook Form v7 + Zod, framer-motion, lucide-react, Tailwind CSS v3

**Spec:** `docs/superpowers/specs/2026-03-17-secure-signup-design.md`

> **No test runner is configured in this project.** Each task verifies with `npm run typecheck` (TypeScript) and `npm run build` (Vite production build). Manual UI checks are listed where relevant.

---

## Chunk 1: PasswordStrengthMeter component

### Task 1: Create `PasswordStrengthMeter.tsx`

**Files:**
- Create: `apps/member/src/components/PasswordStrengthMeter.tsx`

- [ ] **Step 1: Create the file with scoring logic, bar, and chips**

Create `apps/member/src/components/PasswordStrengthMeter.tsx` with the following content exactly:

```tsx
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  password: string
}

// Hex values must match tailwind.config.js color tokens.
// Raw hex required — CSS class names cannot be used in framer-motion's animate prop.
const LEVEL_CONFIG = {
  weak:   { label: 'Weak',   hex: '#EF4444', textClass: 'text-red',       activeCount: 1 },
  fair:   { label: 'Fair',   hex: '#F8C630', textClass: 'text-slate-700', activeCount: 2 },
  strong: { label: 'Strong', hex: '#21C45D', textClass: 'text-green',     activeCount: 3 },
} as const

// text-slate-700 is used in LEVEL_CONFIG above via dynamic interpolation.
// Tailwind's JIT scanner may not see it — the comment below ensures it is retained:
// text-slate-700

type Level = keyof typeof LEVEL_CONFIG

function getLevel(password: string): Level {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  if (score >= 4) return 'strong'
  if (score >= 2) return 'fair'
  return 'weak'
}

// Chip order: 8+chars / Uppercase (col 1 top/bottom), Number / Symbol (col 2 top/bottom)
const CHIPS: { label: string; satisfied: (p: string) => boolean }[] = [
  { label: '8+ chars',  satisfied: (p) => p.length >= 8 },
  { label: 'Uppercase', satisfied: (p) => /[A-Z]/.test(p) },
  { label: 'Number',    satisfied: (p) => /[0-9]/.test(p) },
  { label: 'Symbol',    satisfied: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function PasswordStrengthMeter({ password }: Props) {
  if (password.length === 0) return null

  const level = getLevel(password)
  const { label, hex, textClass, activeCount } = LEVEL_CONFIG[level]

  return (
    <div className="mt-2">
      {/* Strength bar + label */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2].map((i) => {
            const isActive = i < activeCount
            const bg = isActive ? hex : '#E2E8F0'
            return (
              <motion.div
                key={i}
                className="flex-1 h-1.5 rounded-full"
                // initial must equal animate to prevent a flash from browser default on mount
                initial={{ backgroundColor: bg }}
                animate={{ backgroundColor: bg }}
                transition={{ duration: 0.25 }}
              />
            )
          })}
        </div>
        <span className={`text-xs font-semibold shrink-0 ${textClass}`}>{label}</span>
      </div>

      {/* Requirement chips — 2×2 grid */}
      <div className="grid grid-cols-2 gap-1 mt-2">
        {CHIPS.map(({ label: chipLabel, satisfied }) => {
          const ok = satisfied(password)
          return (
            <div key={chipLabel} className="flex items-center gap-1">
              {ok
                ? <CheckCircle2 className="w-3 h-3 text-green shrink-0" />
                : <XCircle     className="w-3 h-3 text-slate-300 shrink-0" />
              }
              <span className={`text-xs ${ok ? 'text-slate-700' : 'text-slate-400'}`}>
                {chipLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd apps/member && npx tsc --noEmit
```

Expected: no errors. If you see `Cannot find module 'framer-motion'` or `lucide-react`, run `npm install --legacy-peer-deps` from the repo root first.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/components/PasswordStrengthMeter.tsx
git commit -m "feat(signup): add PasswordStrengthMeter component"
```

---

## Chunk 2: Wire into SignUp.tsx

> **Prerequisite:** Chunk 1 must be complete — `apps/member/src/components/PasswordStrengthMeter.tsx` must exist before any step in this chunk.

### Task 2: Fix username debounce + update Zod schema

**Files:**
- Modify: `apps/member/src/pages/auth/SignUp.tsx`

- [ ] **Step 1: Add `useRef` to the React import**

Find this line (keep ALL existing names — `useState` is still needed for other state):
```ts
import { useState, useCallback, useEffect } from 'react'
```
Replace with:
```ts
import { useState, useCallback, useEffect, useRef } from 'react'
```

- [ ] **Step 2: Remove the `useState` timer and add a `useRef` timer**

Find and **remove** this line entirely:
```ts
const [usernameTimer, setUsernameTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
```
Add this line in its place:
```ts
const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

- [ ] **Step 3: Replace `handleUsernameChange` entirely**

Find the entire `handleUsernameChange` block (it includes a `setUsernameTimer(t)` call at the end):
```ts
const handleUsernameChange = useCallback((value: string) => {
  if (usernameTimer) clearTimeout(usernameTimer)
  if (!value || value.length < 3 || !USERNAME_RE.test(value)) {
    setUsernameStatus('idle')
    return
  }
  setUsernameStatus('checking')
  const t = setTimeout(async () => {
    const available = await checkUsernameAvailable(value)
    setUsernameStatus(available ? 'available' : 'taken')
  }, 400)
  setUsernameTimer(t)
}, [usernameTimer, checkUsernameAvailable])
```
Replace the entire block with:
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

- [ ] **Step 4: Verify no remaining `usernameTimer` or `setUsernameTimer` references**

After replacing the function in Step 3, search the file for both `usernameTimer` and `setUsernameTimer`. There should be **zero** occurrences of either name. Both the state variable and its setter disappear when the `useState` declaration (Step 2) and the full `handleUsernameChange` body (Step 3) are replaced. If any references remain, TypeScript will error with "Cannot find name '...'" — remove them.

- [ ] **Step 5: Note on the existing inline username error paragraph**

Lines 152–154 of the current file contain:
```tsx
{usernameStatus === 'taken' && !errors.username && (
  <p className="text-red text-xs mt-1">Username already taken</p>
)}
```
**Leave this paragraph as-is.** It serves a different purpose from the `formError` banner: the inline paragraph gives immediate field-level feedback while the user is still typing; the `formError` banner fires only at submit time. They are complementary, not duplicates.

- [ ] **Step 6: Block submit when username check is in flight**

Find in `onSubmit`:
```ts
if (usernameStatus === 'taken') {
  setFormError('Username is already taken.')
  return
}
```
Replace with:
```ts
if (usernameStatus === 'taken' || usernameStatus === 'checking') {
  setFormError(
    usernameStatus === 'checking'
      ? 'Please wait for username check to complete.'
      : 'Username is already taken.'
  )
  return
}
```

- [ ] **Step 7: Update Zod password minimum from 6 to 8**

Find in the `schema` definition:
```ts
password: z.string().min(6, 'At least 6 characters'),
```
Replace with:
```ts
password: z.string().min(8, 'At least 8 characters'),
```

- [ ] **Step 8: Verify TypeScript compiles cleanly**

```bash
cd apps/member && npx tsc --noEmit
```

Expected: no errors. TypeScript will catch any leftover `usernameTimer` or `setUsernameTimer` reference with "Cannot find name '...'".

- [ ] **Step 9: Commit**

```bash
git add apps/member/src/pages/auth/SignUp.tsx
git commit -m "fix(signup): fix username debounce stale closure, update password min to 8"
```

---

### Task 3: Wire `PasswordStrengthMeter` into the password field

**Files:**
- Modify: `apps/member/src/pages/auth/SignUp.tsx`

- [ ] **Step 1: Import `PasswordStrengthMeter`**

Add this import after the existing local component imports (e.g., after the `ComingSoonModal` import line):
```ts
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter'
```

- [ ] **Step 2: Add `watch` to the `useForm` destructure**

Find the existing `useForm` call (there is only one):
```ts
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```
Replace with (add `watch` to the same destructure — do **not** add a second `useForm` call):
```ts
const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

- [ ] **Step 3: Add the watched password variable**

Immediately after the `useForm` destructure, add:
```ts
const watchedPassword = watch('password') ?? ''
```

- [ ] **Step 4: Insert `<PasswordStrengthMeter>` in JSX**

Locate the password field section. It is an outer `<div>` containing a `<label>`, an inner `<div className="relative">` (the input + eye-toggle button), and a `{errors.password && ...}` paragraph.

The meter goes **inside the outer `<div>`**, **after the inner `</div>` (closing the relative wrapper)**, and **before** `{errors.password && ...}`. Replace the entire password field section with:

```tsx
<div>
  <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
  <div className="relative">
    <input
      {...register('password')}
      type={showPassword ? 'text' : 'password'}
      placeholder="••••••••"
      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
    />
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      tabIndex={-1}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
  <PasswordStrengthMeter password={watchedPassword} />
  {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
</div>
```

- [ ] **Step 5: Verify TypeScript + build succeed**

From the repo root:
```bash
npm run typecheck && npm run build
```

Expected: `Tasks: 2 successful` with no TypeScript errors and no CSS warnings.

- [ ] **Step 6: Manual UI verification**

Start the dev server:
```bash
npm run dev:member
```
Open `http://localhost:5173/sign-up` in a mobile viewport (390px width — use browser DevTools device emulation).

Password field checks:
- [ ] Type `a` → meter appears below the input, 1 red segment, label **Weak**, all 4 chips grey with ✗
- [ ] Type `password` (8 chars) → still **Weak**, but `8+ chars` chip turns green ✓
- [ ] Type `Password1` → 2 gold segments, label **Fair**, chips `8+ chars` / `Uppercase` / `Number` green
- [ ] Type `Password1!` → 3 green segments, label **Strong**, all 4 chips green ✓
- [ ] Clear the password field → meter disappears entirely (returns null)
- [ ] Type `abc` (3 chars) then click **Create Account** → Zod error "At least 8 characters" appears below the meter

Username debounce check:
- [ ] Type any username in the `@username` field, then **within 400 ms** click **Create Account** → form error "Please wait for username check to complete." appears
  - *How to reproduce reliably:* type the username and immediately click submit without waiting for the ✓/✗ indicator to appear

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/auth/SignUp.tsx
git commit -m "feat(signup): wire PasswordStrengthMeter, watch password field"
```
