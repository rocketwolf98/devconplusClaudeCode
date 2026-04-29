# OAuth Password & Signup Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two gaps in the Google OAuth flow — redirect OAuth users through `/sign-up` to complete their profile and set a local password, and allow existing OAuth-only users to set a password from ProfileEdit.

**Architecture:** `useAuthStore` gains `isOAuthOnly: boolean` (computed from session identities) and `setPassword()` (no re-auth required). `OAuthCallback` adds a third redirect branch for existing OAuth users with no local password. `SignUp.tsx` detects an active OAuth session on mount and enters a dual-mode that pre-fills fields and adds password setup. `ProfileEdit.tsx` forks the "Account Security" card based on `isOAuthOnly`.

**Tech Stack:** React 19, TypeScript (strict), Zustand v5, React Hook Form v7 + Zod, `@supabase/supabase-js`, Tailwind CSS v3, `solar-icon-set`

---

## File Map

| File | Change |
|---|---|
| `apps/member/src/stores/useAuthStore.ts` | Add `isOAuthOnly` state + `setPassword` action + compute in `initialize()` |
| `apps/member/src/pages/auth/OAuthCallback.tsx` | Add `Session` import; update `redirect()` to take session; three-branch redirect |
| `apps/member/src/pages/auth/SignUp.tsx` | Add `isOAuthMode` / `oauthEmail` state; OAuth detection `useEffect`; add `setValue` to form; fork submit + UI |
| `apps/member/src/pages/profile/ProfileEdit.tsx` | Import `isOAuthOnly`, `setPassword`; add `setPasswordForm`; fork Change Email + Change Password sections |

**Unchanged:** `OAuthProfileComplete.tsx`, `router.tsx`, DB schema

---

## Task 1 — Store: add `isOAuthOnly` + `setPassword`

**Files:**
- Modify: `apps/member/src/stores/useAuthStore.ts`

**Background:** `session.user.identities` is an array of provider objects (`{ provider: 'google' | 'email' | ... }`). A Google-only user has no `'email'` entry. After `supabase.auth.updateUser({ password })`, Supabase adds an `'email'` identity, so the identities array becomes the correct source of truth for "has local password."

- [ ] **Step 1: Add `isOAuthOnly` and `setPassword` to the `AuthState` interface**

Open `apps/member/src/stores/useAuthStore.ts`. Find the `interface AuthState` block (around line 48). Add two entries after the existing `error: string | null` line:

```ts
interface AuthState {
  user: Profile | null
  initials: string
  chapterName: string | null
  isLoading: boolean
  isInitialized: boolean
  isOrganizerSession: boolean
  isOAuthOnly: boolean                          // ← add
  error: string | null

  initialize: () => Promise<void>
  // ... (all existing actions unchanged)
  setPassword: (newPassword: string) => Promise<void>  // ← add at end of interface
}
```

- [ ] **Step 2: Add `isOAuthOnly` to initial store state**

Find the `export const useAuthStore = create<AuthState>((set, get) => ({` block (around line 202). Add `isOAuthOnly: false` after `isOrganizerSession: false`:

```ts
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initials: '',
  chapterName: null,
  isLoading: false,
  isInitialized: false,
  isOrganizerSession: false,
  isOAuthOnly: false,   // ← add
  error: null,
  // ...
```

- [ ] **Step 3: Compute `isOAuthOnly` inside `initialize()`**

Find the `if (session?.user) {` block inside `initialize()` (around line 233). Add the computation as the first two lines inside that block, before `const meta = ...`:

```ts
if (session?.user) {
  // Detect OAuth-only users (no local password) from the identities array.
  // Supabase adds an 'email' identity when updateUser({ password }) is called,
  // so this stays accurate after the user sets a password.
  const identities = session.user.identities ?? []
  const isOAuthOnly = identities.length > 0 && !identities.some(id => id.provider === 'email')
  set({ isOAuthOnly })

  const meta = { ...session.user.user_metadata, email: session.user.email ?? null } as Record<string, string | null>
  const profile = await ensureProfile(session.user.id, meta)
  if (profile) await applyProfile(profile, set)
}
```

- [ ] **Step 4: Add the `setPassword` action**

Find the `updatePassword` action (around line 448). Add `setPassword` immediately after it:

```ts
  setPassword: async (newPassword) => {
    const { error, data } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    // updateUser returns the updated user with refreshed identities.
    const hasEmailIdentity = data.user?.identities?.some(id => id.provider === 'email') ?? false
    set({ isOAuthOnly: !hasEmailIdentity })
  },
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors. If `session.user.identities` gives a type error, the type is `UserIdentity[] | undefined` from `@supabase/supabase-js` — the `?? []` fallback handles `undefined`.

- [ ] **Step 6: Commit**

```bash
git add apps/member/src/stores/useAuthStore.ts
git commit -m "feat(auth): add isOAuthOnly state and setPassword action to store"
```

---

## Task 2 — OAuthCallback: three-branch redirect

**Files:**
- Modify: `apps/member/src/pages/auth/OAuthCallback.tsx`

**Background:** The current `redirect(userId)` function has two branches: incomplete profile → `/oauth-profile-complete`, else → `/home` or `/organizer`. We need three branches: (1) incomplete profile → `/sign-up`, (2) complete profile but no email identity (existing OAuth-only) → `/sign-up`, (3) fully set up → `/home` or `/organizer`. The session is already available at both call sites so we pass it as a second argument.

- [ ] **Step 1: Add the `Session` type import**

At the top of `apps/member/src/pages/auth/OAuthCallback.tsx`, the existing imports are:
```ts
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { DangerTriangleOutline } from 'solar-icon-set'
import { supabase } from '../../lib/supabase'
import { callRateLimit } from '../../stores/useAuthStore'
import logoHorizontal from '../../assets/logos/logo-horizontal.svg'
```

Add a type import for `Session` after the supabase import:

```ts
import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { callRateLimit } from '../../stores/useAuthStore'
```

- [ ] **Step 2: Update `redirect` to accept `session` and implement three-branch logic**

Replace the entire `async function redirect(userId: string) { ... }` block (lines ~34–60) with:

```ts
async function redirect(userId: string, session: Session) {
  if (navigated.current) return
  navigated.current = true
  if (timeoutRef.current) clearTimeout(timeoutRef.current)

  const { data: profile } = await supabase
    .from('profiles')
    .select('chapter_id, username, role')
    .eq('id', userId)
    .maybeSingle()

  // Branch 1: incomplete profile → new user, gate with rate limit
  if (!profile || !profile.chapter_id || !profile.username) {
    const rl = await callRateLimit('oauth_signup')
    if (!rl.allowed) {
      await supabase.auth.signOut()
      navigated.current = false
      setError('rate_limited')
      return
    }
    navigate('/sign-up', { replace: true })
    return
  }

  // Branch 2: complete profile but no local password → existing OAuth-only user
  const identities = session.user.identities ?? []
  const isOAuthOnly = !identities.some(id => id.provider === 'email')
  if (isOAuthOnly) {
    navigate('/sign-up', { replace: true })
    return
  }

  // Branch 3: fully set up user
  if (ORGANIZER_ROLES.includes(profile.role ?? '')) {
    navigate('/organizer', { replace: true })
  } else {
    navigate('/home', { replace: true })
  }
}
```

- [ ] **Step 3: Update the two `redirect(...)` call sites to pass session**

Find the `onAuthStateChange` handler (around line 69):
```ts
// BEFORE:
if (event === 'SIGNED_IN' && session?.user) {
  void redirect(session.user.id)
}
// AFTER:
if (event === 'SIGNED_IN' && session?.user) {
  void redirect(session.user.id, session)
}
```

Find the `getSession().then(...)` call (around line 75):
```ts
// BEFORE:
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) void redirect(session.user.id)
})
// AFTER:
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) void redirect(session.user.id, session)
})
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/auth/OAuthCallback.tsx
git commit -m "feat(auth): redirect OAuth users (new + no-password) to /sign-up"
```

---

## Task 3 — SignUp.tsx: dual-mode OAuth detection + submit

**Files:**
- Modify: `apps/member/src/pages/auth/SignUp.tsx`

**Background:** When `OAuthCallback` redirects to `/sign-up`, the page must detect the active OAuth session and switch to "Complete your profile" mode: email read-only (pre-filled from session), name pre-filled (from profile DB if existing, else from Google metadata), all other fields pre-filled if the profile exists, password field required. The normal `signUp()` store action is NOT called in OAuth mode — instead we call `supabase.auth.updateUser({ password })` + profile upsert directly.

- [ ] **Step 1: Add two new state variables and add `setValue` to the form destructure**

In `SignUp()`, find the state declarations (around line 73) and add after `const [chapters, setChapters] = useState<Chapter[]>([])`:

```ts
const [isOAuthMode, setIsOAuthMode] = useState(false)
const [oauthEmail, setOauthEmail] = useState('')
```

Find the `useForm<FormData>` destructure (around line 94). Add `setValue`:

```ts
const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... },   // unchanged
})
```

- [ ] **Step 2: Guard the draft-save watcher against OAuth pre-fill**

Find the `useEffect` that calls `saveDraft` (around line 109):

```ts
// BEFORE:
useEffect(() => {
  const { unsubscribe } = watch((values) => {
    const { password: _omit, ...rest } = values
    saveDraft(rest as Omit<FormData, 'password'>)
  })
  return unsubscribe
}, [watch, saveDraft])

// AFTER:
useEffect(() => {
  const { unsubscribe } = watch((values) => {
    if (isOAuthMode) return   // session is authoritative in OAuth mode
    const { password: _omit, ...rest } = values
    saveDraft(rest as Omit<FormData, 'password'>)
  })
  return unsubscribe
}, [watch, saveDraft, isOAuthMode])
```

- [ ] **Step 3: Add OAuth detection `useEffect`**

Add a new `useEffect` block AFTER the draft-save watcher but BEFORE `handleUsernameChange`:

```ts
// OAuth completion mode detection — fires when OAuthCallback redirects here
useEffect(() => {
  void supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    const provider = session.user.app_metadata?.provider as string | undefined
    if (!provider || provider === 'email') return  // normal email signup

    const identities = session.user.identities ?? []
    const isOAuthOnly = !identities.some(id => id.provider === 'email')

    void supabase
      .from('profiles')
      .select('full_name, username, email, school_or_company, chapter_id, linkedin_url, github_url, portfolio_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        const isComplete = Boolean(profile?.chapter_id && profile?.username)

        if (isComplete && !isOAuthOnly) {
          // Fully set up — redirect away
          navigate('/home', { replace: true })
          return
        }

        // Enter OAuth completion mode
        setIsOAuthMode(true)
        setOauthEmail(session.user.email ?? '')
        const meta = session.user.user_metadata

        if (profile) {
          // Existing user with no password — pre-fill all fields from DB profile
          setValue('full_name',         profile.full_name ?? '')
          setValue('username',          profile.username ?? '')
          setValue('school_or_company', profile.school_or_company ?? '')
          setValue('chapter_id',        profile.chapter_id ?? '')
          setValue('linkedin_url',      profile.linkedin_url ?? '')
          setValue('github_url',        profile.github_url ?? '')
          setValue('portfolio_url',     profile.portfolio_url ?? '')
        } else {
          // New user — pre-fill name from Google metadata
          const googleName = (meta.full_name as string | undefined)
            ?? (meta.name as string | undefined)
            ?? ''
          setValue('full_name', googleName)
        }
        setValue('email', session.user.email ?? '')
      })
  })
}, [setValue, navigate])
```

- [ ] **Step 4: Add OAuth submit branch to `onSubmit`**

Find `const onSubmit = async (data: FormData) => {` (around line 130). After the username-status guard (the `if (usernameStatus === 'taken' || ...)` block) and the `setFormError(null)` line, add the OAuth branch BEFORE the existing `try { const { emailConfirmationPending } ... }` block:

```ts
  setFormError(null)

  // ── OAuth completion mode ─────────────────────────────────────────────────
  if (isOAuthMode) {
    try {
      // 1. Set local password (no re-auth needed — OAuth session is active)
      const { error: pwErr } = await supabase.auth.updateUser({ password: data.password })
      if (pwErr) {
        setFormError('Failed to set password. Please try again.')
        return
      }

      // 2. Upsert profile (creates or updates — handles both new and existing users)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/sign-in', { replace: true }); return }
      const meta = session.user.user_metadata

      const { error: profileErr } = await supabase.from('profiles').upsert({
        id:                session.user.id,
        full_name:         data.full_name,
        username:          data.username.toLowerCase(),
        email:             session.user.email ?? '',
        chapter_id:        data.chapter_id,
        school_or_company: data.school_or_company || null,
        avatar_url:        (meta.avatar_url as string | undefined) ?? null,
        linkedin_url:      data.linkedin_url  || null,
        github_url:        data.github_url    || null,
        portfolio_url:     data.portfolio_url || null,
        role:              'member',
      }, { onConflict: 'id', ignoreDuplicates: false })

      if (profileErr) {
        setFormError('Something went wrong saving your profile. Please try again.')
        return
      }

      // 3. Initialize store so the rest of the app has the correct user + isOAuthOnly=false
      await useAuthStore.getState().initialize()
      clearDraft()
      navigate('/organizer-code-gate', { replace: true })
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Sign-up failed. Please try again.'
      setFormError(friendlyAuthError(raw))
    }
    return
  }
  // ── END OAuth completion mode ─────────────────────────────────────────────

  // Normal email/password signup (unchanged below)
  try {
    const { emailConfirmationPending } = await signUp(
```

- [ ] **Step 5: Fork the UI — header, email field, Google button, Turnstile, submit label**

**5a — Page title & subtitle.** Find the `<p>` with "Create your account" inside the header (around line 196):

```tsx
// BEFORE:
<p className="text-white/60 mt-3 text-md3-body-md font-proxima relative z-10 uppercase tracking-widest font-bold">
  Create your account
</p>

// AFTER:
<p className="text-white/60 mt-3 text-md3-body-md font-proxima relative z-10 uppercase tracking-widest font-bold">
  {isOAuthMode ? 'Complete your profile' : 'Create your account'}
</p>
```

**5b — Hide Google button in OAuth mode.** Find the Google "Continue with Google" `<button>` and the divider below it (around lines 204–221). Wrap both in a conditional:

```tsx
{!isOAuthMode && (
  <>
    <button
      type="button"
      disabled={googleLoading}
      onClick={async () => {
        setGoogleLoading(true)
        try { await signInWithGoogle() } catch { setGoogleLoading(false) }
      }}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl text-md3-body-md font-semibold text-slate-700 hover:bg-slate-50 transition-colors mb-5 shadow-card disabled:opacity-60"
    >
      <GoogleIcon />
      {googleLoading ? 'Redirecting…' : 'Continue with Google'}
    </button>

    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-md3-label-md text-slate-400 font-medium">or email</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  </>
)}
```

**5c — Email field: read-only display in OAuth mode.** Find the Email `<div>` block (around lines 257–266):

```tsx
// BEFORE:
<div>
  <label className="text-md3-body-md font-medium text-slate-700 block mb-1">Email</label>
  <input
    {...register('email')}
    type="email"
    placeholder="juan@devcon.ph"
    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-md3-body-md focus:outline-none focus:ring-2 focus:ring-blue"
  />
  {errors.email && <p className="text-red text-md3-label-md mt-1">{errors.email.message}</p>}
</div>

// AFTER:
<div>
  <label className="text-md3-body-md font-medium text-slate-700 block mb-1">Email</label>
  {isOAuthMode ? (
    <div className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-md3-body-md text-slate-500 flex items-center gap-2">
      <GoogleIcon />
      <span>{oauthEmail}</span>
    </div>
  ) : (
    <>
      <input
        {...register('email')}
        type="email"
        placeholder="juan@devcon.ph"
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-md3-body-md focus:outline-none focus:ring-2 focus:ring-blue"
      />
      {errors.email && <p className="text-red text-md3-label-md mt-1">{errors.email.message}</p>}
    </>
  )}
</div>
```

**5d — Hide Turnstile in OAuth mode.** Find the `<Turnstile ... />` block (around line 367):

```tsx
// BEFORE:
<Turnstile
  ref={turnstileRef}
  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''}
  onSuccess={(token) => setTurnstileToken(token)}
  onExpire={() => setTurnstileToken(null)}
  onError={() => setTurnstileToken(null)}
  options={{ theme: 'light', size: 'normal' }}
/>

// AFTER:
{!isOAuthMode && (
  <Turnstile
    ref={turnstileRef}
    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''}
    onSuccess={(token) => setTurnstileToken(token)}
    onExpire={() => setTurnstileToken(null)}
    onError={() => setTurnstileToken(null)}
    options={{ theme: 'light', size: 'normal' }}
  />
)}
```

**5e — Submit button: label + disabled logic.** Find the submit `<button>` (around line 376):

```tsx
// BEFORE:
<button
  type="submit"
  disabled={isSubmitting || !turnstileToken}
  className="w-full bg-[#1152d4] text-white font-bold py-4 rounded-2xl disabled:opacity-60 hover:bg-blue-dark transition-colors"
>
  {isSubmitting ? 'Creating account…' : 'Create Account'}
</button>

// AFTER:
<button
  type="submit"
  disabled={isSubmitting || (!isOAuthMode && !turnstileToken)}
  className="w-full bg-[#1152d4] text-white font-bold py-4 rounded-2xl disabled:opacity-60 hover:bg-blue-dark transition-colors"
>
  {isSubmitting
    ? (isOAuthMode ? 'Completing sign-up…' : 'Creating account…')
    : (isOAuthMode ? 'Complete Sign Up' : 'Create Account')}
</button>
```

**5f — Hide "Already have an account?" footer in OAuth mode.** Find the `<p className="text-center ...">` at the bottom (around line 385):

```tsx
// BEFORE:
<p className="text-center text-md3-body-md text-slate-500 mt-6">
  Already have an account?{' '}
  <Link to="/sign-in" className="text-blue font-semibold">Sign In</Link>
</p>

// AFTER:
{!isOAuthMode && (
  <p className="text-center text-md3-body-md text-slate-500 mt-6">
    Already have an account?{' '}
    <Link to="/sign-in" className="text-blue font-semibold">Sign In</Link>
  </p>
)}
```

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors. Common pitfall: `session.user.app_metadata?.provider` may be typed as `string | undefined` — the `as string | undefined` cast in the detection effect handles this.

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/auth/SignUp.tsx
git commit -m "feat(auth): add dual-mode OAuth profile completion to SignUp page"
```

---

## Task 4 — ProfileEdit.tsx: fork Account Security card for OAuth-only users

**Files:**
- Modify: `apps/member/src/pages/profile/ProfileEdit.tsx`

**Background:** When `isOAuthOnly` is true, the existing "Change Email" form is replaced with a static message, and the existing "Change Password" form (which requires `PasswordConfirmModal` with a current password) is replaced by a simpler "Set Password" form that calls `setPassword()` directly. When the user successfully sets a password, `isOAuthOnly` flips to `false` in the store and the card re-renders as the normal "Change Password" flow.

- [ ] **Step 1: Import `isOAuthOnly` and `setPassword` from the store**

Find line 53 in `ProfileEdit.tsx`:
```ts
const { user, initials, updateProfile, uploadAvatar, updateEmail, updatePassword, requestOrganizerUpgrade, checkUsernameAvailable } = useAuthStore()
```

Replace with:
```ts
const { user, initials, updateProfile, uploadAvatar, updateEmail, updatePassword, setPassword, isOAuthOnly, requestOrganizerUpgrade, checkUsernameAvailable } = useAuthStore()
```

- [ ] **Step 2: Add `setPasswordForm` state**

Find where other form state is declared — after the `const passwordForm = useForm<PasswordFormData>({ ... })` line (around line 167). Add:

```ts
const setPasswordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })
const [oauthPwSuccess, setOauthPwSuccess] = useState(false)
const [oauthPwError, setOauthPwError] = useState<string | null>(null)
```

- [ ] **Step 3: Add `handleSetPassword` handler**

After the `handleChangePassword` handler (around line 174), add:

```ts
const handleSetPassword = async (data: PasswordFormData) => {
  setOauthPwError(null)
  try {
    await setPassword(data.new_password)
    setOauthPwSuccess(true)
    setPasswordForm.reset()
  } catch {
    setOauthPwError('Failed to set password. Please try again.')
  }
}
```

- [ ] **Step 4: Fork the Change Email section**

Find the Change Email `<div>` (around line 421, inside the `SENSITIVE SETTINGS CARD`):

```tsx
{/* Change Email */}
<div className="px-4 py-4 border-b border-slate-100">
```

Replace the entire content of this `<div>` with a fork:

```tsx
{/* Change Email */}
<div className="px-4 py-4 border-b border-slate-100">
  <p className="text-md3-body-md font-semibold text-slate-900 mb-0.5 flex items-center gap-2">
    <LetterOutline className="w-4 h-4" color="#94A3B8" />
    {isOAuthOnly ? 'Email' : 'Change Email'}
    {!isOAuthOnly && <span className="text-[10px] font-normal text-slate-400 ml-1">requires password</span>}
  </p>
  {isOAuthOnly ? (
    <p className="text-md3-label-md text-slate-500 mt-1">
      Your email is linked to your Google account. Set a local password below to enable email changes.
    </p>
  ) : (
    <>
      <p className="text-md3-label-md text-slate-400 mb-3">Current: {user?.email}</p>
      {emailSuccess ? (
        <p className="text-green text-md3-label-md flex items-center gap-1"><CheckCircleOutline className="w-3.5 h-3.5" /> Check your new email to confirm the change.</p>
      ) : (
        <form onSubmit={emailForm.handleSubmit(handleChangeEmail)} className="flex gap-2">
          <input
            {...emailForm.register('new_email')}
            type="email"
            placeholder="New email address"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-md3-body-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" className="px-4 py-2.5 bg-primary text-white text-md3-body-md font-bold rounded-xl shrink-0">
            Update
          </button>
        </form>
      )}
      {emailForm.formState.errors.new_email && (
        <p className="text-red text-md3-label-md mt-1">{emailForm.formState.errors.new_email.message}</p>
      )}
    </>
  )}
</div>
```

- [ ] **Step 5: Fork the Change Password section**

Find the Change Password `<div>` (around line 449):

```tsx
{/* Change Password */}
<div className="px-4 py-4">
```

Replace the entire content with a fork:

```tsx
{/* Change / Set Password */}
<div className="px-4 py-4">
  {isOAuthOnly ? (
    <>
      <p className="text-md3-body-md font-semibold text-slate-900 mb-0.5 flex items-center gap-2">
        <LockOutline className="w-4 h-4" color="#94A3B8" />
        Set Password
      </p>
      <p className="text-md3-label-md text-slate-500 mb-3">
        You signed in with Google. Set a local password to also sign in with your email.
      </p>
      {oauthPwSuccess ? (
        <p className="text-green text-md3-label-md flex items-center gap-1 mt-2">
          <CheckCircleOutline className="w-3.5 h-3.5" /> Password set successfully.
        </p>
      ) : (
        <form onSubmit={setPasswordForm.handleSubmit(handleSetPassword)} className="space-y-2 mt-3">
          <input
            {...setPasswordForm.register('new_password')}
            type="password"
            placeholder="New password (min 8 characters)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-md3-body-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {setPasswordForm.formState.errors.new_password && (
            <p className="text-red text-md3-label-md">{setPasswordForm.formState.errors.new_password.message}</p>
          )}
          <input
            {...setPasswordForm.register('confirm_password')}
            type="password"
            placeholder="Confirm password"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-md3-body-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {setPasswordForm.formState.errors.confirm_password && (
            <p className="text-red text-md3-label-md">{setPasswordForm.formState.errors.confirm_password.message}</p>
          )}
          {oauthPwError && (
            <p className="text-red text-md3-label-md mt-1">{oauthPwError}</p>
          )}
          <button
            type="submit"
            disabled={setPasswordForm.formState.isSubmitting}
            className="w-full bg-slate-900 text-white text-md3-body-md font-bold py-3 rounded-xl mt-1 disabled:opacity-60"
          >
            {setPasswordForm.formState.isSubmitting ? 'Setting password…' : 'Set Password'}
          </button>
        </form>
      )}
    </>
  ) : (
    <>
      <p className="text-md3-body-md font-semibold text-slate-900 mb-0.5 flex items-center gap-2">
        <LockOutline className="w-4 h-4" color="#94A3B8" />
        Change Password
        <span className="text-[10px] font-normal text-slate-400 ml-1">requires current password</span>
      </p>
      {passwordSuccess ? (
        <p className="text-green text-md3-label-md flex items-center gap-1 mt-2"><CheckCircleOutline className="w-3.5 h-3.5" /> Password updated successfully.</p>
      ) : (
        <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-2 mt-3">
          <input
            {...passwordForm.register('new_password')}
            type="password"
            placeholder="New password (min 8 characters)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-md3-body-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {passwordForm.formState.errors.new_password && (
            <p className="text-red text-md3-label-md">{passwordForm.formState.errors.new_password.message}</p>
          )}
          <input
            {...passwordForm.register('confirm_password')}
            type="password"
            placeholder="Confirm new password"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-md3-body-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {passwordForm.formState.errors.confirm_password && (
            <p className="text-red text-md3-label-md">{passwordForm.formState.errors.confirm_password.message}</p>
          )}
          <button type="submit" className="w-full bg-slate-900 text-white text-md3-body-md font-bold py-3 rounded-xl mt-1">
            Update Password
          </button>
        </form>
      )}
    </>
  )}
</div>
```

- [ ] **Step 6: Typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: 0 errors, successful build. Common pitfall: `setPasswordForm`, `oauthPwSuccess`, `oauthPwError` — verify no `noUnusedLocals` violations; all three are used in the JSX fork added in Step 5.

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/profile/ProfileEdit.tsx
git commit -m "feat(profile): fork Account Security card — Set Password for OAuth-only users"
```

---

## Task 5 — Final verification

- [ ] **Step 1: Full typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: 0 errors, clean build output.

- [ ] **Step 2: Dev server smoke test**

```bash
npm run dev:member
```

Open `http://localhost:5173`. Verify:
- Normal email signup still works end-to-end (form submits, navigates to `/email-sent` or `/organizer-code-gate`)
- Existing email/password users on `/profile/edit` still see "Change Password" with PasswordConfirmModal

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(auth): complete OAuth password setup and dual-mode signup flow"
```
