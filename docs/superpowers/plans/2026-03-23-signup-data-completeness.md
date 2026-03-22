# Signup Data Completeness & Chapter Enforcement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce chapter membership for all users, fix signup metadata being silently discarded, and add an optional avatar picker on the post-confirmation screen.

**Architecture:** DB migration replaces the `handle_new_user` trigger to write all signup metadata immediately; `ensureProfile` gains a null-field patch as a safety net; `approve_organizer_upgrade` RPC is updated to handle HQ codes safely; the `SignUp` form makes chapter required; `OrganizerCodeGate` gains a non-blocking avatar picker.

**Tech Stack:** PostgreSQL (Supabase), React 19, TypeScript strict, Zustand v5, Tailwind CSS, lucide-react, `@supabase/supabase-js`

**Spec:** `docs/superpowers/specs/2026-03-23-signup-data-completeness-design.md`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `supabase/migrations/20260323_signup_data_fix.sql` | **Create** | Full migration: null cleanup, NOT NULL, trigger replacement, RPC fix |
| `packages/supabase/src/types.ts` | **Modify** | `Profile.chapter_id: string \| null` → `string` |
| `apps/member/src/pages/admin/AdminCMS.tsx` | **Modify** | `?? ''` → `?? null` on `p_chapter_id` RPC arg |
| `apps/member/src/pages/admin/AdminUpgradeRequests.tsx` | **Modify** | Same one-line fix |
| `apps/member/src/pages/auth/SignUp.tsx` | **Modify** | Chapter Zod required + label text |
| `apps/member/src/stores/useAuthStore.ts` | **Modify** | `signUp` signature, `ensureProfile` patch, `uploadAvatar` size guard |
| `apps/member/src/pages/auth/OrganizerCodeGate.tsx` | **Modify** | Avatar picker UI + upload wiring |

---

## Task 1 — Database Migration

**Files:**
- Create: `supabase/migrations/20260323_signup_data_fix.sql`

### What this does

1. Sets `chapter_id` to Manila for any profile with NULL (existing dev accounts)
2. Adds `NOT NULL` constraint to `profiles.chapter_id`
3. Replaces `handle_new_user()` to write `username`, `chapter_id`, `school_or_company` from signup metadata; falls back to Manila if `chapter_id` is missing
4. Replaces `approve_organizer_upgrade()` with COALESCE so HQ codes (NULL chapter) don't violate the constraint

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260323_signup_data_fix.sql
-- ── Part A: chapter_id NOT NULL enforcement ───────────────────────────────────

BEGIN;

-- Reassign any null chapter_id rows to Manila (dev accounts only — no prod users yet)
UPDATE profiles
SET chapter_id = (SELECT id FROM chapters WHERE name = 'Manila' LIMIT 1)
WHERE chapter_id IS NULL;

-- Enforce NOT NULL
ALTER TABLE profiles ALTER COLUMN chapter_id SET NOT NULL;

COMMIT;


-- ── Part B: Replace handle_new_user() trigger ─────────────────────────────────
-- Now writes username, chapter_id, school_or_company from raw_user_meta_data.
-- Falls back to Manila chapter UUID when chapter_id is absent or unparseable.
-- Does NOT award points — trg_award_signup_bonus handles that AFTER INSERT.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  -- Safely parse chapter_id from metadata; any parse failure → NULL → Manila fallback
  BEGIN
    v_chapter_id := (NEW.raw_user_meta_data->>'chapter_id')::uuid;
  EXCEPTION WHEN others THEN
    v_chapter_id := NULL;
  END;

  IF v_chapter_id IS NULL THEN
    SELECT id INTO v_chapter_id FROM chapters WHERE name = 'Manila' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    school_or_company,
    chapter_id,
    role,
    spendable_points,
    lifetime_points
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'school_or_company',
    v_chapter_id,
    'member',
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


-- ── Part C: Fix approve_organizer_upgrade — COALESCE for HQ codes ────────────
-- HQ organizer codes have chapter_id = NULL (by design).
-- After NOT NULL on profiles.chapter_id, setting chapter_id = NULL would violate
-- the constraint. COALESCE retains the user's existing chapter (Manila from trigger).

CREATE OR REPLACE FUNCTION approve_organizer_upgrade(
  p_user_id     uuid,
  p_role        text,
  p_chapter_id  uuid,
  p_request_id  uuid,
  p_reviewer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_role NOT IN ('chapter_officer', 'hq_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  UPDATE profiles
  SET
    role               = p_role,
    chapter_id         = COALESCE(p_chapter_id, chapter_id),
    pending_role       = NULL,
    pending_chapter_id = NULL
  WHERE id = p_user_id;

  UPDATE organizer_upgrade_requests
  SET
    status      = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_organizer_upgrade TO authenticated;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with the SQL above. Confirm it runs without errors.

- [ ] **Step 3: Verify the migration**

Run these checks via `mcp__supabase__execute_sql`:

```sql
-- Check: no NULL chapter_ids remain
SELECT COUNT(*) FROM profiles WHERE chapter_id IS NULL;
-- Expected: 0

-- Check: column is NOT NULL
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'chapter_id';
-- Expected: is_nullable = 'NO'

-- Check: trigger body contains 'v_chapter_id'
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user';
-- Expected: shows the new function body with v_chapter_id and school_or_company

-- Check: approve_organizer_upgrade uses COALESCE
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'approve_organizer_upgrade';
-- Expected: shows COALESCE(p_chapter_id, chapter_id)
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260323_signup_data_fix.sql
git commit -m "feat(db): enforce chapter_id NOT NULL, fix handle_new_user trigger, fix approve_organizer_upgrade COALESCE"
```

---

## Task 2 — Update `Profile` Type

**Files:**
- Modify: `packages/supabase/src/types.ts:63`

The DB now enforces NOT NULL. Update the TypeScript type to match.

- [ ] **Step 1: Update `Profile.chapter_id`**

In `packages/supabase/src/types.ts`, change line 63:

```ts
// Before:
chapter_id: string | null

// After:
chapter_id: string
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero new errors from this change (existing code that reads `profile.chapter_id` still compiles fine; `string` is assignable to `string | null` parameters). If any errors appear, they represent real bugs — fix them.

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/src/types.ts
git commit -m "feat(types): Profile.chapter_id is now non-nullable"
```

---

## Task 3 — Fix Admin Approval Call Sites

**Files:**
- Modify: `apps/member/src/pages/admin/AdminCMS.tsx:164`
- Modify: `apps/member/src/pages/admin/AdminUpgradeRequests.tsx:62`

Passing `''` for a `uuid` parameter in PostgreSQL causes a runtime cast error. Both files use `req.chapter_id ?? ''` as a fallback — change to `?? null`. With the COALESCE fix in the RPC, `null` is now safe and retains the user's existing chapter.

- [ ] **Step 1: Fix `AdminCMS.tsx`**

Find the `handleApprove` function (around line 161). Change:

```ts
// Before:
p_chapter_id:  req.chapter_id ?? '',

// After:
p_chapter_id:  req.chapter_id ?? null,
```

- [ ] **Step 2: Fix `AdminUpgradeRequests.tsx`**

Find the `handleApprove` function (around line 59). Same change:

```ts
// Before:
p_chapter_id:  req.chapter_id ?? '',

// After:
p_chapter_id:  req.chapter_id ?? null,
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/admin/AdminCMS.tsx apps/member/src/pages/admin/AdminUpgradeRequests.tsx
git commit -m "fix(admin): pass null not empty string for HQ chapter_id in approve_organizer_upgrade RPC"
```

---

## Task 4 — Make Chapter Required in SignUp

**Files:**
- Modify: `apps/member/src/pages/auth/SignUp.tsx`

Two changes: Zod schema + label text. Nothing else touches.

- [ ] **Step 1: Update Zod schema**

In `SignUp.tsx`, find the `schema` object (around line 17). Change the `chapter_id` field:

```ts
// Before:
chapter_id: z.string().optional(),

// After:
chapter_id: z.string().min(1, 'Please select your chapter'),
```

- [ ] **Step 2: Update the label**

Find the Chapter label (around line 222):

```tsx
// Before:
Chapter <span className="text-slate-400 font-normal">(optional)</span>

// After:
Chapter
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start the dev server (`npm run dev:member`). Open `/sign-up`. Submit the form without selecting a chapter.
Expected: inline validation error "Please select your chapter" appears below the select.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/auth/SignUp.tsx
git commit -m "feat(signup): make chapter selection required"
```

---

## Task 5 — Auth Store: signUp signature, ensureProfile patch, uploadAvatar size guard

**Files:**
- Modify: `apps/member/src/stores/useAuthStore.ts`

Three changes in one file. Keep them in one commit.

- [ ] **Step 1: Make `chapter_id` required in `signUp()` interface**

In the `AuthState` interface (around line 29), change the `signUp` signature:

```ts
// Before:
signUp: (
  email: string,
  password: string,
  full_name: string,
  username: string,
  school_or_company?: string,
  chapter_id?: string
) => Promise<{ emailConfirmationPending: boolean }>

// After:
signUp: (
  email: string,
  password: string,
  full_name: string,
  username: string,
  school_or_company?: string,
  chapter_id: string
) => Promise<{ emailConfirmationPending: boolean }>
```

- [ ] **Step 2: Update `ensureProfile` to patch null fields after 23505 conflict**

Replace the current `ensureProfile` function (lines 64–86):

```ts
async function ensureProfile(userId: string, meta: Record<string, string | null>): Promise<Profile | null> {
  // Try INSERT first — trigger may have already created the row (23505 conflict expected on first login after email confirmation).
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: meta.full_name ?? meta.email?.split('@')[0] ?? 'User',
      username: meta.username ?? null,
      email: meta.email ?? '',
      school_or_company: meta.school_or_company ?? null,
      chapter_id: meta.chapter_id || null,
      role: 'member',
      spendable_points: 0,
      lifetime_points: 0,
    })
    .select()
    .single()

  if (!error) return (data ?? null) as unknown as Profile | null

  // Profile already exists (trigger created it). Fetch and patch any null fields
  // the trigger left empty (username, chapter_id, school_or_company).
  if (error.code === '23505') {
    const existing = await fetchProfileById(userId)
    if (!existing) return null

    const patch: Partial<Pick<Profile, 'username' | 'chapter_id' | 'school_or_company'>> = {}
    if (!existing.username && meta.username)          patch.username          = meta.username
    if (!existing.chapter_id && meta.chapter_id)      patch.chapter_id        = meta.chapter_id
    if (!existing.school_or_company && meta.school_or_company) patch.school_or_company = meta.school_or_company

    if (Object.keys(patch).length === 0) return existing

    const { error: patchErr } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
    if (patchErr) console.error('[ensureProfile] patch error:', patchErr.code, patchErr.message)

    return { ...existing, ...patch }
  }

  console.error('[ensureProfile] error:', error.code, error.message)
  return null
}
```

- [ ] **Step 3: Add file size guard to `uploadAvatar()`**

In the `uploadAvatar` method (around line 266), add the size check directly after the type check:

```ts
// Before:
if (!ALLOWED_AVATAR_TYPES.includes(file.type)) throw new Error('Only image files are allowed')

// After:
if (!ALLOWED_AVATAR_TYPES.includes(file.type)) throw new Error('Only image files are allowed')
if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10 MB')
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `chapter_id` required in the signature causes a type error at the `SignUp.tsx` call site — that call already passes `data.chapter_id` from a required Zod field (Task 4), so it will be a non-empty `string`. Fix any errors that surface.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/stores/useAuthStore.ts
git commit -m "feat(auth): require chapter_id in signUp, patch ensureProfile null fields, add uploadAvatar size guard"
```

---

## Task 6 — Avatar Picker on OrganizerCodeGate

**Files:**
- Modify: `apps/member/src/pages/auth/OrganizerCodeGate.tsx`

Add an optional, non-blocking avatar picker at the top of the card — visible only in the normal (non-submitted) state. Upload is fire-and-forget; the user can proceed at any time.

- [ ] **Step 1: Add imports**

Add to the existing imports at the top of `OrganizerCodeGate.tsx`:

```ts
import { useRef, useState } from 'react'  // useRef and useState may already be imported — check first
import { Camera, Loader2 } from 'lucide-react'
```

`Camera` and `Loader2` from `lucide-react`. If `useState` is already imported, don't duplicate it.

- [ ] **Step 2: Add avatar state variables**

Inside the component, below the existing state declarations:

```ts
const fileInputRef      = useRef<HTMLInputElement>(null)
const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ?? null)
const [avatarUploading, setAvatarUploading] = useState(false)
const [avatarError,    setAvatarError]    = useState<string | null>(null)
```

Replace the existing destructure with the full set of values needed for this component (include `initials` now — it's used in the JSX in Step 4):

```ts
const { user, initials, setOrganizerSession, requestOrganizerUpgrade, uploadAvatar, updateProfile } = useAuthStore()
```

- [ ] **Step 3: Add avatar file handler**

Below the state declarations, add:

```ts
const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  setAvatarError(null)

  // Show local preview immediately
  const objectUrl = URL.createObjectURL(file)
  setAvatarPreview(objectUrl)
  setAvatarUploading(true)

  try {
    const url = await uploadAvatar(file)
    await updateProfile({ avatar_url: url })
  } catch (err) {
    setAvatarError(err instanceof Error ? err.message : 'Upload failed — tap to retry')
    setAvatarPreview(user?.avatar_url ?? null)  // revert preview on failure
  } finally {
    setAvatarUploading(false)
    // Release blob URL to prevent memory leak
    URL.revokeObjectURL(objectUrl)
  }
}
```

- [ ] **Step 4: Add avatar picker JSX**

Inside the non-submitted branch of the return (the `<>` block that renders the form), add the avatar section **before** the `<h2>` heading:

```tsx
{/* Avatar picker — optional, non-blocking */}
<div className="flex flex-col items-center mb-6">
  <div className="relative w-16 h-16">
    {/* Avatar circle */}
    <div className="w-16 h-16 rounded-full bg-blue/10 overflow-hidden flex items-center justify-center">
      {avatarPreview ? (
        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <span className="text-blue font-bold text-lg select-none">{initials}</span>
      )}
    </div>

    {/* Camera / spinner overlay */}
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={avatarUploading}
      className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue flex items-center justify-center shadow-sm"
      aria-label="Upload profile photo"
    >
      {avatarUploading
        ? <Loader2 className="w-3 h-3 text-white animate-spin" />
        : <Camera className="w-3 h-3 text-white" />
      }
    </button>
  </div>

  {avatarError && (
    <p className="text-red text-xs mt-2 text-center max-w-[180px]">{avatarError}</p>
  )}

  <p className="text-xs text-slate-400 mt-1">Add a profile photo (optional)</p>

  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={handleAvatarChange}
  />
</div>
```

*(The destructure was already updated in Step 2 — `initials` is available here.)*

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

1. Sign up a new account → confirm email → land on `/organizer-code-gate`
2. Verify: initials circle appears above "Are you a Chapter Officer?" heading
3. Tap the camera button → select an image
4. Verify: image previews immediately in the circle, spinner appears on camera button during upload
5. Verify: after upload completes, avatar is visible, no error shown
6. Tap "Continue as Member" → go to `/home`
7. Open `/profile` → verify avatar is shown

- [ ] **Step 7: Commit**

```bash
git add apps/member/src/pages/auth/OrganizerCodeGate.tsx
git commit -m "feat(auth): add optional avatar picker on OrganizerCodeGate post-confirmation screen"
```

---

## Final Verification

- [ ] **Full signup flow end-to-end**

1. Open `/sign-up`
2. Fill in all fields including chapter (required — verify no "(optional)" label)
3. Try submitting without chapter — verify "Please select your chapter" error
4. Submit with all fields → land on `/email-sent`
5. Confirm email → land on `/email-confirm` → redirect to `/organizer-code-gate`
6. Verify avatar picker is present, `initials` are correct (from signup full_name)
7. Upload an avatar (test type rejection with a `.txt` file; test size rejection with a file > 10 MB if available)
8. Tap "Continue as Member" → land on `/home`
9. Open `/profile` — verify: `full_name`, `username`, `chapter`, `school_or_company`, `avatar_url` all populated

- [ ] **Verify no data loss in DB**

```sql
-- Run via Supabase MCP execute_sql
SELECT id, full_name, username, chapter_id, school_or_company, avatar_url
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
-- All fields should be populated for accounts created after this migration
```

- [ ] **Final typecheck**

```bash
npm run typecheck
```

Expected: zero errors.
