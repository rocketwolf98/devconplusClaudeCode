# Form Draft Persistence — Design Spec
**Date:** 2026-04-14
**Status:** Approved

## Problem

All user-editable forms in the member and organizer apps lose their in-progress data on an accidental browser refresh. This affects sign-up, sign-in, event registration, volunteer applications, and the organizer event create/edit flows.

## Goal

Restore form state automatically after a page refresh, with no user action required. Clear the draft on successful submission so a fresh form is always shown for a new session.

---

## Architecture

### Hook: `useFormDraft`

**Location:** `apps/member/src/hooks/useFormDraft.ts`

**Signature:**
```ts
function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  storage: 'session' | 'local',
  options?: { exclude?: (keyof T)[] }
): {
  draft: Partial<T>
  saveDraft: (values: Partial<T>) => void
  clearDraft: () => void
}
```

**Behaviour:**
- On mount: reads `devcon-draft:<key>` from the specified storage and returns `draft`
- `saveDraft(values)` — debounced 400ms write; strips keys listed in `options.exclude` before writing; adds a `_savedAt` ISO timestamp to the payload
- `clearDraft()` — synchronous removal of `devcon-draft:<key>` from storage
- All storage access is wrapped in try/catch (private browsing may throw on `localStorage` quota errors)
- No Zustand, no React context — pure storage reads/writes

**Storage key namespace:** `devcon-draft:<key>` — avoids collisions with `devcon-theme` and other existing localStorage entries.

---

## Storage Split

| Storage | Rationale | Forms |
|---|---|---|
| `sessionStorage` | Auth drafts should not persist across browser close | `sign-in`, `sign-up` |
| `localStorage` | Event forms may be authored across sessions | `event-register:<slug>`, `event-volunteer:<slug>`, `org-event-create`, `org-event-edit:<id>` |

---

## Per-Form Integration

### SignIn (`sessionStorage`, key `sign-in`)
- **Persist:** `email` only
- **Exclude:** `password`
- **Read:** pass `draft` as `defaultValues` to `useForm`
- **Write:** `watch()` subscription → `saveDraft` on every change
- **Clear:** on successful `signIn()` call before `navigate('/home')`

### SignUp (`sessionStorage`, key `sign-up`)
- **Persist:** `full_name`, `username`, `email`, `school_or_company`, `chapter_id`, `linkedin_url`, `github_url`, `portfolio_url`
- **Exclude:** `password`
- **Read:** pass `draft` as `defaultValues` to `useForm`
- **Write:** `watch()` → `saveDraft`
- **Clear:** on successful `signUp()` call before navigate

### EventRegister (`localStorage`, key `event-register:<slug>`)
- **Persist:** `formResponses` (Record<string, string | string[]>) + `agreed` (boolean)
- These live in React state (not RHF), so:
  - Read: initialize `formResponses` and `agreed` from `draft` on mount
  - Write: call `saveDraft({ formResponses, agreed })` inside `setResponse` and `setAgreed`
- **Clear:** on successful `register()` call

### EventVolunteer (`localStorage`, key `event-volunteer:<slug>`)
- **Persist:** `reason`, `phone_number`, `social_media_handle`
- **Read:** pass `draft` as `defaultValues` to `useForm`
- **Write:** `watch()` → `saveDraft`
- **Clear:** on successful `applyToVolunteer()` call

### OrgEventCreate (`localStorage`, key `org-event-create`)
- **Persist:** all RHF fields + `tags` (string[]) + `visibility` ('public' | 'unlisted' | 'draft') + `customFields` (CustomFormField[])
- **Read:** pass RHF fields from `draft` as `defaultValues`; initialize `tags`, `visibility`, `customFields` state from draft
- **Write (RHF):** `watch()` → `saveDraft({ ...rhfValues, tags, visibility, customFields })`
- **Write (outside-RHF):** `useEffect([tags, visibility, customFields])` → `saveDraft` (merged with latest RHF values via `getValues()`)
- **Clear:** on successful `createEvent()` call

### OrgEventEdit (`localStorage`, key `org-event-edit:<id>`)
- Same field shape as Create
- **Draft priority:** if a draft exists (`_savedAt` timestamp is present), it takes precedence over the DB-loaded event values as `defaultValues`. This handles the case where an organizer was mid-edit and refreshed.
- **Clear:** on successful `updateEvent()` call; also clear on delete confirmation

---

## Data Flow

```
Mount
  └─ useFormDraft reads storage
       └─ draft passed as defaultValues / initial state

User types
  └─ onChange → saveDraft (debounced 400ms)
       └─ writes devcon-draft:<key> to storage

Accidental refresh
  └─ Mount again → draft restored ✓

Successful submit
  └─ clearDraft() → storage key removed
       └─ next visit starts with empty form ✓
```

---

## Error Handling

- Storage read errors (quota, private mode): catch silently, return `{}` as draft — form starts empty, no crash
- Storage write errors: catch silently, log warning — form works normally, just won't persist

---

## What Is NOT Persisted

- Passwords (security — never written to storage)
- File uploads / cover images (binary data not suited for storage)
- Read-only pre-filled fields (name, email, school on EventRegister)
- `usernameStatus` UI state (recomputed on mount via the existing debounced check)
- Turnstile tokens (expire quickly, always re-issued)

---

## Out of Scope

- Profile edit forms (data already in DB, less risk of loss)
- Reward create/edit forms (organizer-only, low-frequency)
- Admin forms
- Expiry / TTL on drafts (YAGNI — clearDraft on submit is sufficient)
