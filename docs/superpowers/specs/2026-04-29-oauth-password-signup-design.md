# OAuth Password & Signup Completion — Design Spec

**Date:** 2026-04-29
**Status:** Approved

---

## Problem Statement

Two related gaps in the Google OAuth registration flow:

1. **Set Password (existing OAuth users):** Users who registered via Google OAuth have no local password. The "Change Password" UI in `ProfileEdit.tsx` requires entering a current password via `PasswordConfirmModal` — which OAuth users cannot provide — blocking them entirely.

2. **OAuth signup completes on SignUp page:** After Google OAuth, new users are redirected to `/oauth-profile-complete` (a lightweight form with no password field). The desired flow is to redirect them back to the standard `/sign-up` page so they can set a password and complete all required fields in one place.

---

## Scope

- **In scope:** `useAuthStore.ts`, `OAuthCallback.tsx`, `SignUp.tsx`, `ProfileEdit.tsx`
- **Out of scope:** Email change for OAuth users (Change Email form is hidden for OAuth-only users with an explanatory message; no new email-change flow is added)
- **Backward compatibility:** `/oauth-profile-complete` route remains in the router as a graceful fallback; the page itself is unchanged

---

## Design

### 1. Store changes — `useAuthStore.ts`

**New state field:** `isOAuthOnly: boolean` (default `false`)

Computed in `initialize()` after getting the session:
```ts
const identities = session?.user?.identities ?? []
const isOAuthOnly = identities.length > 0 && !identities.some(id => id.provider === 'email')
set({ isOAuthOnly })
```

Supabase adds an `email` identity when `updateUser({ password })` is called, so this field correctly tracks "has no local password" throughout the session lifecycle.

**New action:** `setPassword(newPassword: string): Promise<void>`

```ts
setPassword: async (newPassword) => {
  const { error, data } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  const hasEmailIdentity = data.user?.identities?.some(id => id.provider === 'email') ?? false
  set({ isOAuthOnly: !hasEmailIdentity })
}
```

No current-password re-auth required — the active OAuth session is sufficient for `updateUser`.

**Interface additions:**
```ts
isOAuthOnly: boolean
setPassword: (newPassword: string) => Promise<void>
```

---

### 2. OAuthCallback.tsx — redirect logic

Replace the two-branch redirect (`/oauth-profile-complete` vs `/home`/`/organizer`) with a three-branch check:

```ts
async function redirect(userId: string, session: Session) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('chapter_id, username, role')
    .eq('id', userId)
    .maybeSingle()

  // Branch 1: incomplete profile (new user)
  if (!profile || !profile.chapter_id || !profile.username) {
    const rl = await callRateLimit('oauth_signup')
    if (!rl.allowed) { /* sign out + setError('rate_limited') */ return }
    navigate('/sign-up', { replace: true })
    return
  }

  // Branch 2: complete profile but no local password (existing OAuth user)
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

The `redirect` function now receives `session` so it can inspect `identities` without an extra network call.

---

### 3. SignUp.tsx — dual-mode

#### OAuth detection (on mount)

Two new local state fields: `isOAuthMode: boolean`, `oauthEmail: string`.

```ts
useEffect(() => {
  void supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    const provider = session.user.app_metadata?.provider
    if (!provider || provider === 'email') return   // normal email signup — do nothing

    // Determine if user has a local password
    const identities = session.user.identities ?? []
    const isOAuthOnly = !identities.some(id => id.provider === 'email')

    // Fetch existing profile (may or may not exist)
    void supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        const isComplete = profile?.chapter_id && profile?.username

        if (isComplete && !isOAuthOnly) {
          // Fully set up — redirect away
          navigate('/home', { replace: true })
          return
        }

        // Enter OAuth completion mode:
        // - New user (no profile): pre-fill from Google metadata
        // - Existing user (has profile, no password): pre-fill from profile
        setIsOAuthMode(true)
        setOauthEmail(session.user.email ?? '')
        const meta = session.user.user_metadata

        if (profile) {
          // Existing user — pre-fill all fields from saved profile
          setValue('full_name', profile.full_name)
          setValue('username',  profile.username ?? '')
          setValue('school_or_company', profile.school_or_company ?? '')
          setValue('chapter_id', profile.chapter_id ?? '')
          setValue('linkedin_url',  profile.linkedin_url  ?? '')
          setValue('github_url',    profile.github_url    ?? '')
          setValue('portfolio_url', profile.portfolio_url ?? '')
        } else {
          // New user — pre-fill name from Google only
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

When the profile already exists (existing OAuth user with no password), all form fields arrive pre-filled from the DB. The user only needs to type a password — all other fields are already populated.

#### Visual changes in OAuth mode

| Element | Normal | OAuth mode |
|---|---|---|
| Page title | "Create your account" | "Complete your profile" |
| Subtitle | "Join DEVCON+" | "You're almost in — set a password and fill in a few details" |
| Email field | Editable input | Read-only, pre-filled from Google session, styled with Google icon badge |
| Full name | Empty | Pre-filled from `user_metadata.full_name \|\| name`, editable |
| Password | Required | Required (user must set local password) |
| All other fields | Same | Same |
| Submit label | "Create Account" | "Complete Sign Up" |

Email field in OAuth mode renders as a styled read-only display, not a form input — it is not included in the form submission (the email comes from the session, not the form).

#### Submit in OAuth mode

```ts
if (isOAuthMode) {
  // 1. Set local password
  const { error: pwErr } = await supabase.auth.updateUser({ password: data.password })
  if (pwErr) { setFormError('Failed to set password. Please try again.'); return }

  // 2. Upsert profile (same fields as OAuthProfileComplete.tsx)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { navigate('/sign-in', { replace: true }); return }
  const meta = session.user.user_metadata
  const { error } = await supabase.from('profiles').upsert({
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
  if (error) { setFormError('Something went wrong. Please try again.'); return }

  // 3. Reload store (isOAuthOnly recomputes to false)
  await useAuthStore.getState().initialize()
  navigate('/organizer-code-gate', { replace: true })
  return
}
// else: existing signUp() logic unchanged
```

#### Zod schema note

The existing `signUpSchema` validates `email` as a required field. In OAuth mode, email is injected via `setValue` from the session but the field is read-only. The schema stays the same — `setValue('email', session.user.email)` ensures the form value is present for validation.

---

### 4. ProfileEdit.tsx — OAuth escape hatch

Import `isOAuthOnly` and `setPassword` from `useAuthStore`.

#### Change Email section

- **OAuth-only user:** Replace the form with:
  ```
  Your email is linked to your Google account.
  Set a local password below to enable email changes.
  ```
- **Non-OAuth user:** Existing "Change Email" form, no changes.

#### Change Password section

**OAuth-only user — "Set Password" UI:**

```
Set Password
You signed in with Google. Set a local password to also sign in with your email.

[New password field]
[Confirm password field]
[Set Password button]
```

- No `PasswordConfirmModal`
- On submit: validate fields, call `setPassword(newPassword)` directly
- On success: green "Password set successfully." message; `isOAuthOnly` flips to `false` in store, causing the section to re-render as the regular "Change Password" form on next interaction

**Non-OAuth user — "Change Password" UI (unchanged):**

Label remains "Change Password (requires current password)". Existing `PasswordConfirmModal` flow is untouched.

#### Password form schema for OAuth Set Password

Reuse the existing `passwordSchema` (min 8 chars, must match). No new schema needed.

---

## Error handling

| Scenario | Handling |
|---|---|
| `updateUser({ password })` fails in SignUp OAuth submit | Show inline error: "Failed to set password. Please try again." |
| Profile upsert fails in SignUp OAuth submit | Show inline error: "Something went wrong saving your profile. Please try again." |
| `setPassword()` fails in ProfileEdit | Throw propagates to the form handler; show inline error below the button |
| User lands on `/sign-up` with complete OAuth profile AND has local password | Silently redirect to `/home` on mount |
| Existing OAuth user (complete profile, no password) lands on `/sign-up` | Enters OAuth completion mode with all fields pre-filled from DB profile |
| `isOAuthOnly` cannot be computed (identities unavailable) | Default `false` — user sees existing "Change Password" flow; worst case they get an auth error from PasswordConfirmModal which they can dismiss |

---

## Files changed

| File | Change |
|---|---|
| `apps/member/src/stores/useAuthStore.ts` | Add `isOAuthOnly`, `setPassword` |
| `apps/member/src/pages/auth/OAuthCallback.tsx` | Three-branch redirect: new user → `/sign-up`; existing OAuth-only → `/sign-up`; complete → `/home`/`/organizer` |
| `apps/member/src/pages/auth/SignUp.tsx` | Add OAuth detection + dual-mode UI + OAuth submit handler |
| `apps/member/src/pages/profile/ProfileEdit.tsx` | Fork Change Email + Change Password sections on `isOAuthOnly` |

**Unchanged:** `OAuthProfileComplete.tsx`, `router.tsx`, DB schema (no migration needed)
