# Signup Data Completeness & Chapter Enforcement
> Date: 2026-03-23
> Status: Approved
> Branch: security-hardening

---

## Problem

Three related gaps in the signup pipeline were identified:

1. **Chapter not enforced** — `profiles.chapter_id` is nullable in the DB and labeled "optional" in the UI, but every member must belong to a chapter for event filtering, officer scope, and QR check-in to work correctly.

2. **Signup data silently discarded** — The `handle_new_user()` trigger (migration 011) creates the profile row immediately on `auth.users` INSERT but only writes `full_name`, `email`, `school_or_company`, `role`, and `total_points`. It does not read `username` or `chapter_id` from `raw_user_meta_data`. When `ensureProfile()` runs later, it hits a `23505` unique violation (row already exists), falls back to `fetchProfileById`, and returns the trigger-created row — which has `NULL` for `username`, `chapter_id`, and `school_or_company` even though the user provided them at signup.

3. **No avatar on signup** — The `avatars` storage bucket requires an authenticated session (RLS: `auth.uid()`). With email confirmation enabled, there is no session at signup time, so avatar upload is not possible during the form submit step.

---

## Decisions

- **Avatar at signup**: deferred to `OrganizerCodeGate` (the first authenticated screen after email confirmation). Upload is non-blocking and optional.
- **Existing null `chapter_id` rows**: reassigned to Manila (first chapter) in the migration. Safe for dev accounts; no production users exist yet.
- **`ensureProfile` fix strategy**: Approach C — fix the trigger as the primary fix, plus a targeted patch in `ensureProfile` as a safety net for edge cases (e.g. Google OAuth users whose metadata differs).

---

## Scope

| # | Change | Location |
|---|--------|----------|
| 1 | `chapter_id NOT NULL` + null cleanup migration | new migration SQL |
| 2 | Update `handle_new_user()` trigger to read all signup metadata fields | same migration |
| 3 | `ensureProfile` patches null fields after 23505 conflict | `useAuthStore.ts` |
| 4 | Chapter required in Zod schema + UI label updated | `SignUp.tsx` |
| 5 | Optional non-blocking avatar picker | `OrganizerCodeGate.tsx` |

---

## Design

### 1. Database Migration (`20260323_signup_data_fix.sql`)

**Step 1 — Reassign null chapters to Manila:**
```sql
UPDATE profiles
SET chapter_id = (SELECT id FROM chapters WHERE name = 'Manila' LIMIT 1)
WHERE chapter_id IS NULL;
```

**Step 2 — Enforce NOT NULL:**
```sql
ALTER TABLE profiles ALTER COLUMN chapter_id SET NOT NULL;
```

**Step 3 — Replace `handle_new_user()` trigger:**

The updated trigger reads `username`, `chapter_id`, and `school_or_company` from `NEW.raw_user_meta_data`. Profile is complete from the moment the auth user is created.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  -- Parse chapter_id safely (NULL if missing or invalid UUID)
  BEGIN
    v_chapter_id := (NEW.raw_user_meta_data->>'chapter_id')::uuid;
  EXCEPTION WHEN others THEN
    v_chapter_id := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    username,
    school_or_company,
    chapter_id,
    role,
    total_points
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'DEVCON Member'),
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'school_or_company',
    v_chapter_id,
    'member',
    0
  );

  -- Award 500pt signup bonus
  INSERT INTO public.point_transactions (user_id, amount, description, source)
  VALUES (NEW.id, 500, 'Welcome to DEVCON+!', 'signup');

  UPDATE public.profiles
    SET total_points = 500
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
```

---

### 2. `ensureProfile` Safety Net (`useAuthStore.ts`)

After a `23505` conflict, instead of returning the trigger-created row as-is, fetch the existing profile and patch only fields that are still `NULL`:

```
try INSERT with all signup fields
→ success: return new profile
→ 23505 conflict:
    existing = fetchProfileById(userId)
    build patch from: username, chapter_id, school_or_company
      include a field only if existing value is NULL and meta has a value
    if patch is non-empty:
      UPDATE profiles SET patch WHERE id = userId
      return merged profile (existing + patch)
    else:
      return existing profile (no update needed)
```

On every subsequent login the existing row will already be fully populated, so the patch will be empty and the UPDATE is skipped entirely.

---

### 3. Sign Up UI (`SignUp.tsx`)

- Remove `.optional()` from `chapter_id` in the Zod schema; add `.min(1, 'Please select your chapter')`
- Change label text from `Chapter (optional)` to `Chapter`
- The existing disabled placeholder option `Select your chapter…` with `value=""` remains — Zod will reject submission if it is still selected

No other form fields change.

---

### 4. Avatar Picker on OrganizerCodeGate (`OrganizerCodeGate.tsx`)

Placement: top of the card, above the existing heading.

**UI:**
- Circular avatar (same `w-16 h-16` initials style used elsewhere in the app)
- Camera icon overlay in the bottom-right corner of the circle
- Tapping opens a hidden `<input type="file" accept="image/*">`
- On file select → show preview immediately (local object URL)
- Upload via `useAuthStore.uploadAvatar()` → on success call `updateProfile({ avatar_url })` to persist
- During upload: spinner replaces the camera icon on the circle
- Non-blocking: user can proceed to "Request Officer Access" or "Continue as Member" at any time, with or without uploading

**Error handling:**
- File type not allowed → show inline error below the circle ("Only image files are allowed")
- Upload failure → show inline error; user can retry or skip

**Avatar is entirely optional** — no validation, no required state, no blocking of the next step.

---

## Out of Scope

- Compressing / resizing images client-side before upload (deferred; Supabase storage handles large files fine for MVP)
- Showing the avatar picker for returning users who already have `avatar_url` set (they use ProfileEdit)
- Backfilling `username` for existing dev accounts with `NULL` username (no migration needed; they can set it in ProfileEdit)
