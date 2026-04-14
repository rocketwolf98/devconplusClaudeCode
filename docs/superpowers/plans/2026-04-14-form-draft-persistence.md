# Form Draft Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore in-progress form data automatically after an accidental browser refresh across all user-facing forms in the member and organizer apps.

**Architecture:** A single `useFormDraft` hook reads from `sessionStorage` or `localStorage` on mount, exposes a debounced `saveDraft` writer, and a synchronous `clearDraft` to call on successful submit. Each form wires the hook once, passing its fields and excluded keys.

**Tech Stack:** React 19, TypeScript strict, React Hook Form v7, Zustand v5, Vite/Vitest (no test runner set up — verification is manual via dev server)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Create** | `apps/member/src/hooks/useFormDraft.ts` | Generic draft persistence hook |
| **Modify** | `apps/member/src/pages/auth/SignIn.tsx` | Persist email (sessionStorage) |
| **Modify** | `apps/member/src/pages/auth/SignUp.tsx` | Persist all fields except password (sessionStorage) |
| **Modify** | `apps/member/src/pages/events/EventRegister.tsx` | Persist formResponses + agreed (localStorage) |
| **Modify** | `apps/member/src/pages/events/EventVolunteer.tsx` | Persist reason/phone/social (localStorage) |
| **Modify** | `apps/member/src/pages/organizer/events/EventCreate.tsx` | Persist all RHF fields + tags/visibility/customFields (localStorage) |
| **Modify** | `apps/member/src/pages/organizer/events/EventEdit.tsx` | Same as Create, draft overrides DB values (localStorage) |

---

## Task 1: Create `useFormDraft` hook

**Files:**
- Create: `apps/member/src/hooks/useFormDraft.ts`

- [ ] **Step 1: Write the hook**

Create `apps/member/src/hooks/useFormDraft.ts` with this exact content:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

const NAMESPACE = 'devcon-draft:'

function readStorage(storage: Storage, key: string): Record<string, unknown> {
  try {
    const raw = storage.getItem(NAMESPACE + key)
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function writeStorage(storage: Storage, key: string, value: Record<string, unknown>): void {
  try {
    storage.setItem(NAMESPACE + key, JSON.stringify(value))
  } catch (err) {
    console.warn('[useFormDraft] write failed', err)
  }
}

function removeStorage(storage: Storage, key: string): void {
  try {
    storage.removeItem(NAMESPACE + key)
  } catch {
    // ignore — draft loss is acceptable
  }
}

export function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  storageType: 'session' | 'local',
  options?: { exclude?: (keyof T)[] },
): {
  draft: Partial<T>
  saveDraft: (values: Partial<T>) => void
  clearDraft: () => void
} {
  const storage = storageType === 'session' ? sessionStorage : localStorage
  const exclude = options?.exclude ?? []

  const [draft] = useState<Partial<T>>(() => {
    const raw = readStorage(storage, key)
    // Strip internal metadata before returning to caller
    const { _savedAt: _omit, ...rest } = raw
    return rest as Partial<T>
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveDraft = useCallback(
    (values: Partial<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const filtered = Object.fromEntries(
          Object.entries(values).filter(([k]) => !(exclude as string[]).includes(k)),
        )
        writeStorage(storage, key, { ...filtered, _savedAt: new Date().toISOString() })
      }, 400)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storage, key],
  )

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    removeStorage(storage, key)
  }, [storage, key])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { draft, saveDraft, clearDraft }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: no new errors from `useFormDraft.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/hooks/useFormDraft.ts
git commit -m "feat: add useFormDraft hook for form draft persistence"
```

---

## Task 2: Wire SignIn — persist email

**Files:**
- Modify: `apps/member/src/pages/auth/SignIn.tsx`

The form currently uses `useForm` with no `defaultValues`. We add `useFormDraft` to restore the email field from `sessionStorage`.

- [ ] **Step 1: Add the import**

In `SignIn.tsx`, add `useFormDraft` to the existing imports block (after the existing hooks imports):

```ts
import { useFormDraft } from '../../hooks/useFormDraft'
```

- [ ] **Step 2: Add draft hook call inside `SignIn` component**

Add this immediately after the existing `useState` calls (before the `useForm` call):

```ts
const { draft, saveDraft, clearDraft } = useFormDraft<{ email: string }>(
  'sign-in',
  'session',
  { exclude: ['password'] },
)
```

- [ ] **Step 3: Set defaultValues on the useForm call**

Change the existing `useForm` call from:

```ts
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

to:

```ts
const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { email: (draft.email as string) ?? '' },
})
```

- [ ] **Step 4: Add watch subscription to save draft**

Add this block after the `useForm` call:

```ts
useEffect(() => {
  const { unsubscribe } = watch((values) => {
    saveDraft({ email: values.email as string })
  })
  return unsubscribe
}, [watch, saveDraft])
```

- [ ] **Step 5: Clear draft on successful sign-in**

In `onSubmit`, find the success path:

```ts
navigate('/home')
```

Replace with:

```ts
clearDraft()
navigate('/home')
```

- [ ] **Step 6: Manual verification**

Run `npm run dev:member`. Navigate to `/sign-in`. Type an email. Refresh the page. The email field should be restored. Sign in successfully — refresh and visit `/sign-in` again — the email field should be empty.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add apps/member/src/pages/auth/SignIn.tsx
git commit -m "feat: persist sign-in email draft in sessionStorage"
```

---

## Task 3: Wire SignUp — persist all fields except password

**Files:**
- Modify: `apps/member/src/pages/auth/SignUp.tsx`

- [ ] **Step 1: Add import**

```ts
import { useFormDraft } from '../../hooks/useFormDraft'
```

- [ ] **Step 2: Add draft hook call**

Add after the existing `useState` calls (before the `useForm` call):

```ts
const { draft, saveDraft, clearDraft } = useFormDraft<Omit<FormData, 'password'>>(
  'sign-up',
  'session',
  { exclude: ['password'] },
)
```

- [ ] **Step 3: Add defaultValues to useForm**

Change the existing `useForm` call from:

```ts
const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

to:

```ts
const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    full_name:         (draft.full_name         as string) ?? '',
    username:          (draft.username           as string) ?? '',
    email:             (draft.email              as string) ?? '',
    school_or_company: (draft.school_or_company  as string) ?? '',
    chapter_id:        (draft.chapter_id         as string) ?? '',
    linkedin_url:      (draft.linkedin_url        as string) ?? '',
    github_url:        (draft.github_url          as string) ?? '',
    portfolio_url:     (draft.portfolio_url       as string) ?? '',
  },
})
```

- [ ] **Step 4: Add watch subscription**

Add after the `useForm` call (the `watchedPassword` line already uses `watch('password')` — place this block after it):

```ts
useEffect(() => {
  const { unsubscribe } = watch((values) => {
    const { password: _omit, ...rest } = values
    saveDraft(rest as Omit<FormData, 'password'>)
  })
  return unsubscribe
}, [watch, saveDraft])
```

- [ ] **Step 5: Clear draft on successful sign-up**

In `onSubmit`, both success branches call `navigate(...)`. Find the two navigate calls and add `clearDraft()` before each:

```ts
// Before:
if (emailConfirmationPending) {
  navigate('/email-sent', { state: { email: data.email, type: 'signup' } })
} else {
  navigate(getPostAuthRoute())
}

// After:
if (emailConfirmationPending) {
  clearDraft()
  navigate('/email-sent', { state: { email: data.email, type: 'signup' } })
} else {
  clearDraft()
  navigate(getPostAuthRoute())
}
```

- [ ] **Step 6: Manual verification**

Navigate to `/sign-up`. Fill in name, username, email, chapter. Refresh — all fields should be restored (password empty). Complete sign-up — revisit `/sign-up` — form should be empty.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add apps/member/src/pages/auth/SignUp.tsx
git commit -m "feat: persist sign-up draft in sessionStorage (excludes password)"
```

---

## Task 4: Wire EventRegister — persist custom fields + agreed

**Files:**
- Modify: `apps/member/src/pages/events/EventRegister.tsx`

`formResponses` and `agreed` are plain React state (not RHF), so draft is read to initialize state and written on every mutation.

- [ ] **Step 1: Add import**

```ts
import { useFormDraft } from '../../hooks/useFormDraft'
```

- [ ] **Step 2: Add draft hook call**

Add after the `slug` destructure, before existing state declarations:

```ts
const { draft, saveDraft, clearDraft } = useFormDraft<{
  formResponses: Record<string, string | string[]>
  agreed: boolean
}>(`event-register:${slug ?? ''}`, 'local')
```

- [ ] **Step 3: Initialize state from draft**

Change the existing state initializers from:

```ts
const [agreed, setAgreed] = useState(false)
const [formResponses, setFormResponses] = useState<Record<string, string | string[]>>({})
```

to:

```ts
const [agreed, setAgreed] = useState<boolean>((draft.agreed as boolean) ?? false)
const [formResponses, setFormResponses] = useState<Record<string, string | string[]>>(
  (draft.formResponses as Record<string, string | string[]>) ?? {},
)
```

- [ ] **Step 4: Save draft in setResponse**

Find the existing `setResponse` function:

```ts
const setResponse = (fieldId: string, value: string | string[]) => {
  setFormResponses(prev => ({ ...prev, [fieldId]: value }))
  if (fieldErrors[fieldId]) setFieldErrors(prev => ({ ...prev, [fieldId]: '' }))
}
```

Replace with:

```ts
const setResponse = (fieldId: string, value: string | string[]) => {
  const next = { ...formResponses, [fieldId]: value }
  setFormResponses(next)
  if (fieldErrors[fieldId]) setFieldErrors(prev => ({ ...prev, [fieldId]: '' }))
  saveDraft({ formResponses: next, agreed })
}
```

- [ ] **Step 5: Save draft when agreed changes**

Find the T&C checkbox JSX:

```tsx
onChange={(e) => setAgreed(e.target.checked)}
```

Replace with:

```tsx
onChange={(e) => {
  const checked = e.target.checked
  setAgreed(checked)
  saveDraft({ formResponses, agreed: checked })
}}
```

- [ ] **Step 6: Clear draft on successful submit**

In `handleSubmit`, find the navigate call after successful registration:

```ts
navigate(destination, { replace: true })
```

Replace with:

```ts
clearDraft()
navigate(destination, { replace: true })
```

- [ ] **Step 7: Manual verification**

Navigate to an event's `/register` page. Fill in custom fields, check the T&C box. Refresh. Fields and checkbox should be restored. Submit successfully — revisit the page (it will redirect, but clear the draft key from devtools Application → LocalStorage and reload) to confirm the draft is gone.

- [ ] **Step 8: Typecheck and commit**

```bash
npm run typecheck
git add apps/member/src/pages/events/EventRegister.tsx
git commit -m "feat: persist event registration custom fields draft in localStorage"
```

---

## Task 5: Wire EventVolunteer — persist reason/phone/social

**Files:**
- Modify: `apps/member/src/pages/events/EventVolunteer.tsx`

- [ ] **Step 1: Add import**

```ts
import { useFormDraft } from '../../hooks/useFormDraft'
```

- [ ] **Step 2: Add draft hook call**

Add after the `slug` / store destructures, before `submitError` state:

```ts
const { draft, saveDraft, clearDraft } = useFormDraft<FormValues>(
  `event-volunteer:${slug ?? ''}`,
  'local',
)
```

- [ ] **Step 3: Add defaultValues to useForm**

Change the existing `useForm` call from:

```ts
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<FormValues>({
  resolver: zodResolver(schema),
})
```

to:

```ts
const {
  register,
  handleSubmit,
  watch,
  formState: { errors, isSubmitting },
} = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {
    reason:               (draft.reason               as string) ?? '',
    phone_number:         (draft.phone_number         as string) ?? '',
    social_media_handle:  (draft.social_media_handle  as string) ?? '',
  },
})
```

- [ ] **Step 4: Add watch subscription**

Add after the `useForm` call:

```ts
useEffect(() => {
  const { unsubscribe } = watch((values) => {
    saveDraft(values as Partial<FormValues>)
  })
  return unsubscribe
}, [watch, saveDraft])
```

- [ ] **Step 5: Clear draft on successful submit**

In `onSubmit`, find the success path:

```ts
if (result.success) {
  setSubmitted(true)
}
```

Replace with:

```ts
if (result.success) {
  clearDraft()
  setSubmitted(true)
}
```

- [ ] **Step 6: Manual verification**

Navigate to `/events/:slug/volunteer`. Type a reason, phone, handle. Refresh — fields should be restored. Submit successfully — revisit the page — form should be empty (application already exists, so you see the read-only status card anyway, but the draft key should be gone from localStorage).

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add apps/member/src/pages/events/EventVolunteer.tsx
git commit -m "feat: persist volunteer application draft in localStorage"
```

---

## Task 6: Wire OrgEventCreate — persist all fields

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventCreate.tsx`

This form has RHF fields AND outside-RHF state (`tags`, `visibility`, `customFields`). Two save triggers are needed: one from the RHF watch subscription, one from a useEffect on the outside-RHF state.

- [ ] **Step 1: Add import**

```ts
import { useFormDraft } from '../../../hooks/useFormDraft'
```

- [ ] **Step 2: Define a draft value type above the component**

Add this type alias above the `OrgEventCreate` function (after the imports):

```ts
type EventCreateDraft = FormData & {
  tags: string[]
  visibility: 'public' | 'unlisted' | 'draft'
  customFields: CustomFormField[]
}
```

- [ ] **Step 3: Add draft hook call**

Add after `const { createEvent } = useEventsStore()` and `const { user } = useAuthStore()`, before the `fileInputRef`:

```ts
const { draft, saveDraft, clearDraft } = useFormDraft<EventCreateDraft>(
  'org-event-create',
  'local',
)
```

- [ ] **Step 4: Initialize outside-RHF state from draft**

Change the three existing state initializers from:

```ts
const [tags, setTags] = useState<string[]>([])
const [tagInput, setTagInput] = useState('')
const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'draft'>('public')
const [customFields, setCustomFields] = useState<CustomFormField[]>([])
```

to:

```ts
const [tags, setTags] = useState<string[]>((draft.tags as string[]) ?? [])
const [tagInput, setTagInput] = useState('')
const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'draft'>(
  (draft.visibility as 'public' | 'unlisted' | 'draft') ?? 'public',
)
const [customFields, setCustomFields] = useState<CustomFormField[]>(
  (draft.customFields as CustomFormField[]) ?? [],
)
```

- [ ] **Step 5: Set defaultValues on useForm from draft**

Change the existing `useForm` `defaultValues` block from:

```ts
defaultValues: {
  points_value:      5,
  volunteer_points:  DEFAULT_VOLUNTEER_POINTS,
  requires_approval: false,
  is_chapter_locked: true,
  is_free:           true,
  ticket_price_php:  0,
  visibility:        'public',
  tags:              [],
},
```

to:

```ts
defaultValues: {
  title:             (draft.title             as string)  ?? '',
  description:       (draft.description       as string)  ?? '',
  location:          (draft.location          as string)  ?? '',
  event_date:        (draft.event_date         as string)  ?? '',
  end_date:          (draft.end_date           as string)  ?? '',
  category:          (draft.category           as FormData['category']) ?? undefined,
  devcon_category:   (draft.devcon_category    as FormData['devcon_category']) ?? undefined,
  points_value:      (draft.points_value       as number)  ?? 5,
  volunteer_points:  (draft.volunteer_points   as number)  ?? DEFAULT_VOLUNTEER_POINTS,
  requires_approval: (draft.requires_approval  as boolean) ?? false,
  is_chapter_locked: (draft.is_chapter_locked  as boolean) ?? true,
  is_free:           (draft.is_free            as boolean) ?? true,
  ticket_price_php:  (draft.ticket_price_php   as number)  ?? 0,
  capacity:          (draft.capacity           as number)  ?? undefined,
  visibility:        'public',
  tags:              [],
},
```

Also add `getValues` to the `useForm` destructure:

```ts
const {
  register,
  handleSubmit,
  watch,
  setValue,
  control,
  getValues,
  formState: { errors, isSubmitting },
} = useForm<FormData>({ ... })
```

- [ ] **Step 6: Add two save effects**

Add these two effects after the `prevCategoryRef` block (after the auto-set attendance points logic):

```ts
// Save RHF fields → draft whenever any field changes
useEffect(() => {
  const { unsubscribe } = watch((values) => {
    saveDraft({ ...(values as Partial<FormData>), tags, visibility, customFields })
  })
  return unsubscribe
}, [watch, saveDraft, tags, visibility, customFields])

// Save outside-RHF state → draft whenever tags/visibility/customFields change
useEffect(() => {
  saveDraft({ ...getValues(), tags, visibility, customFields })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tags, visibility, customFields])
```

- [ ] **Step 7: Clear draft on successful submit**

In `onSubmit`, find:

```ts
navigate('/organizer/events')
```

Replace with:

```ts
clearDraft()
navigate('/organizer/events')
```

- [ ] **Step 8: Manual verification**

Navigate to `/organizer/events/create`. Fill in title, description, pick a category, add a tag, switch visibility to Draft. Refresh — all fields including tags, visibility chip, and category selection should be restored. Submit successfully — revisit the create page — form should be empty.

- [ ] **Step 9: Typecheck and commit**

```bash
npm run typecheck
git add apps/member/src/pages/organizer/events/EventCreate.tsx
git commit -m "feat: persist event create draft in localStorage"
```

---

## Task 7: Wire OrgEventEdit — persist edits, draft overrides DB values

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventEdit.tsx`

Draft takes precedence over DB values — an organizer who was mid-edit and refreshed should see their unsaved edits, not the DB state.

- [ ] **Step 1: Add import**

```ts
import { useFormDraft } from '../../../hooks/useFormDraft'
```

- [ ] **Step 2: Define the same EventCreateDraft type (copy from EventCreate)**

Add above the `OrgEventEdit` function:

```ts
type EventEditDraft = FormData & {
  tags: string[]
  visibility: 'public' | 'unlisted' | 'draft'
  customFields: CustomFormField[]
}
```

- [ ] **Step 3: Add draft hook call**

Add after the `const { user } = useAuthStore()` line:

```ts
const { draft, saveDraft, clearDraft } = useFormDraft<EventEditDraft>(
  `org-event-edit:${id ?? ''}`,
  'local',
)
const hasDraft = Object.keys(draft).length > 0
```

- [ ] **Step 4: Initialize outside-RHF state from draft (with fallback to event)**

Change the three outside-RHF state initializers from:

```ts
const [customFields, setCustomFields] = useState<CustomFormField[]>(
  Array.isArray(event?.custom_form_schema) ? (event.custom_form_schema as CustomFormField[]) : []
)
const [tags, setTags] = useState<string[]>(event?.tags ?? [])
const [tagInput, setTagInput] = useState('')
const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'draft'>(
  (event?.visibility as 'public' | 'unlisted' | 'draft') ?? 'public'
)
```

to:

```ts
const [customFields, setCustomFields] = useState<CustomFormField[]>(
  hasDraft
    ? ((draft.customFields as CustomFormField[]) ?? [])
    : Array.isArray(event?.custom_form_schema)
      ? (event.custom_form_schema as CustomFormField[])
      : [],
)
const [tags, setTags] = useState<string[]>(
  hasDraft ? ((draft.tags as string[]) ?? []) : (event?.tags ?? []),
)
const [tagInput, setTagInput] = useState('')
const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'draft'>(
  hasDraft
    ? ((draft.visibility as 'public' | 'unlisted' | 'draft') ?? 'public')
    : ((event?.visibility as 'public' | 'unlisted' | 'draft') ?? 'public'),
)
```

- [ ] **Step 5: Update useForm defaultValues to prefer draft**

The existing `defaultValues` block is already event-driven. Wrap each field to prefer draft when `hasDraft` is true:

```ts
defaultValues: event
  ? {
      title:             hasDraft ? (draft.title             as string)  ?? event.title             : event.title,
      description:       hasDraft ? (draft.description       as string)  ?? event.description ?? '' : event.description ?? '',
      location:          hasDraft ? (draft.location          as string)  ?? event.location ?? ''    : event.location ?? '',
      event_date:        hasDraft ? (draft.event_date         as string)  ?? (event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '') : event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
      end_date:          hasDraft ? (draft.end_date           as string)  ?? (event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '')   : event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
      category:          hasDraft ? (draft.category           as FormData['category'])       ?? (event.category as FormData['category'])       : event.category as FormData['category'],
      devcon_category:   hasDraft ? (draft.devcon_category    as FormData['devcon_category']) ?? (event.devcon_category ?? null) as FormData['devcon_category'] : (event.devcon_category ?? null) as FormData['devcon_category'],
      points_value:      hasDraft ? (draft.points_value       as number)  ?? (event.points_value ?? 5)                   : event.points_value ?? 5,
      volunteer_points:  hasDraft ? (draft.volunteer_points   as number)  ?? (event.volunteer_points ?? DEFAULT_VOLUNTEER_POINTS) : event.volunteer_points ?? DEFAULT_VOLUNTEER_POINTS,
      requires_approval: hasDraft ? (draft.requires_approval  as boolean) ?? (event.requires_approval ?? false)          : event.requires_approval ?? false,
      is_chapter_locked: hasDraft ? (draft.is_chapter_locked  as boolean) ?? (event.is_chapter_locked ?? false)          : event.is_chapter_locked ?? false,
      is_free:           hasDraft ? (draft.is_free            as boolean) ?? (event.is_free ?? true)                     : event.is_free ?? true,
      ticket_price_php:  hasDraft ? (draft.ticket_price_php   as number)  ?? (event.ticket_price_php ?? 0)               : event.ticket_price_php ?? 0,
      capacity:          hasDraft ? (draft.capacity           as number | undefined) ?? event.capacity ?? undefined       : event.capacity ?? undefined,
      visibility:        (event.visibility ?? 'public') as 'public' | 'unlisted' | 'draft',
    }
  : {
      points_value:      5,
      volunteer_points:  DEFAULT_VOLUNTEER_POINTS,
      requires_approval: false,
      is_chapter_locked: false,
      is_free:           true,
      ticket_price_php:  0,
      visibility:        'public',
      tags:              [],
    },
```

Also add `getValues` to the `useForm` destructure:

```ts
const {
  register,
  handleSubmit,
  watch,
  setValue,
  control,
  getValues,
  formState: { errors, isSubmitting },
} = useForm<FormData>({ ... })
```

- [ ] **Step 6: Add two save effects**

Add after the `prevCategoryRef` block:

```ts
// Save RHF fields → draft
useEffect(() => {
  const { unsubscribe } = watch((values) => {
    saveDraft({ ...(values as Partial<FormData>), tags, visibility, customFields })
  })
  return unsubscribe
}, [watch, saveDraft, tags, visibility, customFields])

// Save outside-RHF state → draft
useEffect(() => {
  saveDraft({ ...getValues(), tags, visibility, customFields })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tags, visibility, customFields])
```

- [ ] **Step 7: Clear draft on successful update and on delete**

Find the success path in `onSubmit` (the `navigate` after `updateEvent`). Replace:

```ts
navigate(`/organizer/events/${id}`)
```

with:

```ts
clearDraft()
navigate(`/organizer/events/${id}`)
```

Find the delete confirmation success path (where `navigate('/organizer/events')` is called after `deleteEvent`):

```ts
navigate('/organizer/events')
```

Replace with:

```ts
clearDraft()
navigate('/organizer/events')
```

- [ ] **Step 8: Manual verification**

Navigate to `/organizer/events/:id/edit`. Change the title and description. Refresh — edited values should be restored, not the DB originals. Save successfully — revisit the edit page — DB values should load (draft is gone). Edit → hit delete → confirm the event is deleted and the draft is cleared.

- [ ] **Step 9: Typecheck and commit**

```bash
npm run typecheck
git add apps/member/src/pages/organizer/events/EventEdit.tsx
git commit -m "feat: persist event edit draft in localStorage, draft overrides DB values on restore"
```

---

## Self-Review

**Spec coverage:**
- ✅ `useFormDraft` hook with `session`/`local` split — Task 1
- ✅ SignIn email (sessionStorage) — Task 2
- ✅ SignUp all-except-password (sessionStorage) — Task 3
- ✅ EventRegister formResponses + agreed (localStorage) — Task 4
- ✅ EventVolunteer reason/phone/social (localStorage) — Task 5
- ✅ OrgEventCreate all fields + outside-RHF state (localStorage) — Task 6
- ✅ OrgEventEdit draft overrides DB values, clears on update AND delete (localStorage) — Task 7
- ✅ `devcon-draft:` namespace to avoid collisions with `devcon-theme`
- ✅ `_savedAt` timestamp stripped before returning draft to caller
- ✅ Storage errors caught silently — form works normally, just won't persist
- ✅ Passwords never written to storage (excluded in SignIn/SignUp, not a field in other forms)
- ✅ File uploads not persisted (binary data not suited for storage)

**Placeholder scan:** No TBDs or TODOs — all steps contain exact code.

**Type consistency:** `useFormDraft<T>` generic, `EventCreateDraft` / `EventEditDraft` local aliases, `draft.field as Type` cast pattern consistent across all tasks. `clearDraft()` / `saveDraft()` / `draft` names used consistently.
