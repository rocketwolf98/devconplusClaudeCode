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

### 2. OAuthCallback.tsx — one-line redirect change

When the OAuth user's profile is incomplete (`!chapter_id || !username`), redirect to `/sign-up` instead of `/oauth-profile-complete`:

```ts
// Before
navigate('/oauth-profile-complete', { replace: true })
// After
navigate('/sign-up', { replace: true })
```

---

### 3. SignUp.tsx — dual-mode

#### OAuth detection (on mount)

```ts
useEffect(() => {
  void supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    const provider = session.user.app_metadata?.provider
    if (!provider || provider === 'email') return          // normal email signup

    // OAuth session — check if profile is already complete
    void supabase
      .from('profiles')
      .select('chapter_id, username')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (profile?.chapter_id && profile?.username) {
          // Already complete — redirect away (MemberLayout auth guard handles
          // further routing to /organizer for organizer roles)
          navigate('/home', { replace: true })
          return
        }
        // Incomplete — enter OAuth completion mode
        setIsOAuthMode(true)
        const meta = session.user.user_metadata
        const googleName = (meta.full_name as string | undefined)
          ?? (meta.name as string | undefined)
          ?? ''
        setValue('full_name', googleName)
        setValue('email', session.user.email ?? '')
      })
  })
}, [setValue, navigate])
```

New local state: `isOAuthMode: boolean`, `oauthEmail: string`.

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
| User lands on `/sign-up` with complete OAuth profile | Silently redirect to `/home` or `/organizer` on mount |
| `isOAuthOnly` cannot be computed (identities unavailable) | Default `false` — user sees existing "Change Password" flow; worst case they get an auth error from PasswordConfirmModal which they can dismiss |

---

## Files changed

| File | Change |
|---|---|
| `apps/member/src/stores/useAuthStore.ts` | Add `isOAuthOnly`, `setPassword` |
| `apps/member/src/pages/auth/OAuthCallback.tsx` | Redirect new users to `/sign-up` |
| `apps/member/src/pages/auth/SignUp.tsx` | Add OAuth detection + dual-mode UI + OAuth submit handler |
| `apps/member/src/pages/profile/ProfileEdit.tsx` | Fork Change Email + Change Password sections on `isOAuthOnly` |

**Unchanged:** `OAuthProfileComplete.tsx`, `router.tsx`, DB schema (no migration needed)
