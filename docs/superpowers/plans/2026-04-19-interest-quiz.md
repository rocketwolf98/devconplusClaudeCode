# Interest Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-screen pill-grid interest quiz at `/interests` that fires once after signup, saves three `integer[]` columns to `profiles`, and displays the results as a color-coded card on the Profile page.

**Architecture:** A new seeded `interest_options` table holds all pill options. Three nullable `integer[]` columns (`interests`, `tech_stack`, `community_roles`) are added to `profiles` — `NULL` means never seen the quiz, `{}` means skipped. `OrganizerCodeGate` is updated to route to `/interests` instead of `/home`. `MemberLayout` redirects any authenticated user with `interests IS NULL` to `/interests` before they reach member routes. The quiz is also re-entrant from Profile via `?from=profile`.

**Tech Stack:** React 19, TypeScript strict, Zustand v5, Supabase JS client (`apps/member/src/lib/supabase.ts`), Framer Motion (`fadeUp` from `lib/animation`), `solar-icon-set` outline, Tailwind CSS v3, React Router DOM v7.

**Design reference:** `apps/member/src/pages/auth/OrganizerCodeGate.tsx` — exact same shell: `min-h-screen bg-blue` header, `bg-slate-50 rounded-t-3xl` card body, `bg-navy rounded-2xl` CTA.

> **Before starting:** Create a git worktree for this feature using `superpowers:using-git-worktrees`. Branch name: `feat/interest-quiz`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| CREATE | `supabase/migrations/20260419_interest_quiz.sql` | Schema + seed data |
| REGEN | `packages/supabase/src/database.types.ts` | Auto-generated Supabase types |
| MODIFY | `packages/supabase/src/types.ts` | Add 3 fields to `Profile` interface |
| CREATE | `apps/member/src/stores/useInterestsStore.ts` | Fetch options, save selections |
| CREATE | `apps/member/src/pages/auth/InterestQuiz.tsx` | 3-screen quiz page |
| MODIFY | `apps/member/src/router.tsx` | Add `/interests` route |
| MODIFY | `apps/member/src/pages/auth/OrganizerCodeGate.tsx` | Navigate to `/interests` instead of `/home` |
| MODIFY | `apps/member/src/components/MemberLayout.tsx` | Redirect `interests === null` users |
| MODIFY | `apps/member/src/pages/profile/Profile.tsx` | Add Interests & Stack card section |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260419_interest_quiz.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260419_interest_quiz.sql

-- 1. Lookup table for all pill options (seeded, read-only for members)
CREATE TABLE interest_options (
  id       serial PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('interest', 'tech_stack', 'community_role')),
  label    text NOT NULL,
  emoji    text  -- reserved for future use (push notifications, KMP native app); not rendered in web UI
);

ALTER TABLE interest_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interest_options public read"
  ON interest_options FOR SELECT USING (true);

-- 2. Three nullable integer[] columns on profiles
--    NULL  = user has never seen the quiz (triggers the one-time redirect)
--    '{}'  = user went through the quiz and skipped / selected nothing
--    '{1,2,3}' = user made selections
ALTER TABLE profiles
  ADD COLUMN interests       integer[] DEFAULT NULL,
  ADD COLUMN tech_stack      integer[] DEFAULT NULL,
  ADD COLUMN community_roles integer[] DEFAULT NULL;

-- 3. GIN indexes for future overlap queries (Tinder-style matching)
CREATE INDEX profiles_interests_gin       ON profiles USING GIN (interests);
CREATE INDEX profiles_tech_stack_gin      ON profiles USING GIN (tech_stack);
CREATE INDEX profiles_community_roles_gin ON profiles USING GIN (community_roles);

-- 4. Seed data — 12 interests + 12 tech_stack + 8 community_roles = 32 rows
INSERT INTO interest_options (category, label, emoji) VALUES
  ('interest', 'AI / ML',       '🤖'),
  ('interest', 'Web Dev',       '🌐'),
  ('interest', 'DevOps',        '⚙️'),
  ('interest', 'Cybersecurity', '🔐'),
  ('interest', 'Mobile',        '📱'),
  ('interest', 'Data Science',  '📊'),
  ('interest', 'Cloud',         '☁️'),
  ('interest', 'Blockchain',    '⛓️'),
  ('interest', 'UI / UX',       '🎨'),
  ('interest', 'Game Dev',      '🎮'),
  ('interest', 'Open Source',   '🔓'),
  ('interest', 'IoT',           '🔌'),
  ('tech_stack', 'React',       '⚛️'),
  ('tech_stack', 'Vue',         '🟢'),
  ('tech_stack', 'Angular',     '🔺'),
  ('tech_stack', 'TypeScript',  '🔷'),
  ('tech_stack', 'JavaScript',  '🟡'),
  ('tech_stack', 'Python',      '🐍'),
  ('tech_stack', 'Go',          '🐹'),
  ('tech_stack', 'Java',        '☕'),
  ('tech_stack', 'Flutter',     '🦋'),
  ('tech_stack', 'Kotlin',      '🤖'),
  ('tech_stack', 'Rust',        '🦀'),
  ('tech_stack', 'PHP',         '🐘'),
  ('community_role', 'Speaker',    '🎤'),
  ('community_role', 'Volunteer',  '🤝'),
  ('community_role', 'Mentor',     '🧑‍🏫'),
  ('community_role', 'Blogger',    '📝'),
  ('community_role', 'Hackathon',  '💻'),
  ('community_role', 'Student',    '🌱'),
  ('community_role', 'Hiring',     '🏢'),
  ('community_role', 'Job Seeker', '🔍');
```

- [ ] **Step 2: Apply the migration**

Option A — Supabase CLI:
```bash
supabase db push
```

Option B — Supabase Dashboard SQL editor: paste and run the file contents.

Expected: no errors. Verify in Supabase Dashboard → Table Editor that `interest_options` exists with 32 rows, and `profiles` has the three new columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260419_interest_quiz.sql
git commit -m "feat(db): add interest_options table and profile interest columns"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Regenerate: `packages/supabase/src/database.types.ts`
- Modify: `packages/supabase/src/types.ts`

- [ ] **Step 1: Regenerate database.types.ts**

Find your Supabase project ID from `apps/member/.env.local` — it's the subdomain in `VITE_SUPABASE_URL` (e.g. `https://abcdefgh.supabase.co` → project ID is `abcdefgh`).

```bash
supabase gen types typescript --project-id <your-project-id> \
  > packages/supabase/src/database.types.ts
```

Verify the generated file now includes `interests`, `tech_stack`, `community_roles` in the `profiles` row type:
```ts
// Should appear in database.types.ts under Tables > profiles > Row:
interests: number[] | null
tech_stack: number[] | null
community_roles: number[] | null
```

- [ ] **Step 2: Update the manual Profile interface**

Open `packages/supabase/src/types.ts`. Find the `Profile` interface and add three fields at the bottom (before the closing `}`):

```ts
// Add these three lines to the Profile interface:
interests:       number[] | null
tech_stack:      number[] | null
community_roles: number[] | null
```

The updated interface should look like:
```ts
export interface Profile {
  id: string
  full_name: string
  username: string | null
  email: string
  school_or_company: string | null
  chapter_id: string
  role: UserRole
  avatar_url: string | null
  spendable_points: number | null
  lifetime_points: number | null
  referral_code: string | null
  pending_role: string | null
  pending_chapter_id: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  created_at: string
  interests:       number[] | null   // ← new
  tech_stack:      number[] | null   // ← new
  community_roles: number[] | null   // ← new
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If you see errors about `interests` not existing on Profile, verify Step 2 was applied to the correct interface in `packages/supabase/src/types.ts`.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/src/database.types.ts packages/supabase/src/types.ts
git commit -m "feat(types): add interests, tech_stack, community_roles to Profile"
```

---

## Task 3: useInterestsStore

**Files:**
- Create: `apps/member/src/stores/useInterestsStore.ts`

- [ ] **Step 1: Create the store**

```ts
// apps/member/src/stores/useInterestsStore.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface InterestOption {
  id: number
  category: 'interest' | 'tech_stack' | 'community_role'
  label: string
  emoji: string | null
}

interface InterestsState {
  options: InterestOption[]
  isLoading: boolean
  error: string | null
  fetchOptions: () => Promise<void>
  saveSelections: (
    interests: number[],
    techStack: number[],
    communityRoles: number[]
  ) => Promise<void>
}

export const useInterestsStore = create<InterestsState>((set) => ({
  options: [],
  isLoading: false,
  error: null,

  fetchOptions: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('interest_options')
      .select('id, category, label, emoji')
      .order('id')
    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }
    set({ options: (data ?? []) as InterestOption[], isLoading: false })
  },

  saveSelections: async (interests, techStack, communityRoles) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        interests,
        tech_stack: techStack,
        community_roles: communityRoles,
      })
      .eq('id', user.id)

    if (error) {
      console.error('[useInterestsStore] saveSelections error:', error)
      // Still navigate — user can edit from Profile later
      return
    }

    // Re-initialize auth store so user.interests reflects the new values
    await useAuthStore.getState().initialize()
  },
}))
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. The `supabase.from('profiles').update({ interests, ... })` call might flag a type mismatch if `database.types.ts` wasn't regenerated — fix by completing Task 2 first.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/stores/useInterestsStore.ts
git commit -m "feat(store): add useInterestsStore for interest quiz options and save"
```

---

## Task 4: InterestQuiz Page

**Files:**
- Create: `apps/member/src/pages/auth/InterestQuiz.tsx`

- [ ] **Step 1: Note the logo src used in OrganizerCodeGate**

Open `apps/member/src/pages/auth/OrganizerCodeGate.tsx` and find the `<img>` tag for the DEVCON+ logo. Note the exact `src` value — you will use the same path in InterestQuiz.

- [ ] **Step 2: Create the component**

```tsx
// apps/member/src/pages/auth/InterestQuiz.tsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftOutline } from 'solar-icon-set'
import { useAuthStore } from '../../stores/useAuthStore'
import { useInterestsStore } from '../../stores/useInterestsStore'
import { fadeUp } from '../../lib/animation'

type Step = 0 | 1 | 2

const STEP_TITLES: Record<Step, string> = {
  0: 'What excites you?',
  1: 'Your stack?',
  2: 'Your role?',
}
const STEP_SUBS: Record<Step, string> = {
  0: 'Pick your tech interests',
  1: 'Languages & frameworks you use',
  2: 'How you give back to the community',
}
const STEP_CATEGORIES: Record<Step, 'interest' | 'tech_stack' | 'community_role'> = {
  0: 'interest',
  1: 'tech_stack',
  2: 'community_role',
}

export default function InterestQuiz() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromProfile = searchParams.get('from') === 'profile'

  const user = useAuthStore((s) => s.user)
  const { options, isLoading, fetchOptions, saveSelections } = useInterestsStore()

  const [step, setStep] = useState<Step>(0)
  // Three separate selection arrays: [interests, techStack, communityRoles]
  const [selections, setSelections] = useState<[number[], number[], number[]]>(
    [[], [], []]
  )
  const [isSaving, setIsSaving] = useState(false)

  // Pre-fill from existing profile on re-entry
  useEffect(() => {
    if (user) {
      setSelections([
        user.interests ?? [],
        user.tech_stack ?? [],
        user.community_roles ?? [],
      ])
    }
  }, [user])

  useEffect(() => {
    void fetchOptions()
  }, [fetchOptions])

  const stepOptions = useMemo(
    () => options.filter((o) => o.category === STEP_CATEGORIES[step]),
    [options, step]
  )

  const currentSelection = selections[step]

  function togglePill(id: number) {
    setSelections((prev) => {
      const next = [...prev] as [number[], number[], number[]]
      const s = new Set(next[step])
      if (s.has(id)) s.delete(id)
      else s.add(id)
      next[step] = Array.from(s)
      return next
    })
  }

  async function commitAndExit(toSave: [number[], number[], number[]]) {
    setIsSaving(true)
    await saveSelections(toSave[0], toSave[1], toSave[2])
    navigate(fromProfile ? '/profile' : '/home', { replace: true })
  }

  async function handleNext() {
    if (step < 2) {
      setStep((s) => (s + 1) as Step)
    } else {
      await commitAndExit(selections)
    }
  }

  async function handleSkipStep() {
    if (step < 2) {
      // Clear this step's selection in local state and advance — no DB write yet
      setSelections((prev) => {
        const next = [...prev] as [number[], number[], number[]]
        next[step] = []
        return next
      })
      setStep((s) => (s + 1) as Step)
    } else {
      // Last step — save with empty community_roles
      await commitAndExit([selections[0], selections[1], []])
    }
  }

  async function handleSkipAll() {
    await commitAndExit([[], [], []])
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Header — matches OrganizerCodeGate shell */}
      <div className="px-4 pt-12 pb-10 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          {fromProfile ? (
            <button
              onClick={() => navigate('/profile')}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeftOutline className="w-5 h-5" />
            </button>
          ) : (
            // Use the same logo src as OrganizerCodeGate (check that file for the exact path)
            <img
              src="/devcon-logo-white.svg"
              alt="DEVCON+"
              className="h-7 w-auto"
            />
          )}
          <button
            onClick={fromProfile ? () => navigate('/profile') : handleSkipAll}
            disabled={isSaving}
            className="text-white/60 text-md3-label-md font-semibold hover:text-white/80 transition-colors disabled:opacity-40"
          >
            {fromProfile ? 'Cancel' : 'Skip all'}
          </button>
        </div>

        {/* Step dots */}
        <div className="flex gap-[5px] mb-3">
          {([0, 1, 2] as Step[]).map((i) => (
            <div
              key={i}
              className={`h-[3px] rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-white' : 'w-[18px] bg-white/30'
              }`}
            />
          ))}
        </div>

        <h1 className="text-md3-title-lg font-black text-white mb-1">
          {STEP_TITLES[step]}
        </h1>
        <p className="text-md3-body-md text-white/70">{STEP_SUBS[step]}</p>
      </div>

      {/* Body card */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-4 pt-6 pb-32 overflow-y-auto">
        <p className="text-md3-label-md text-slate-400 mb-3">
          {currentSelection.length > 0
            ? `${currentSelection.length} selected`
            : 'None selected — you can skip'}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-wrap gap-[6px] mb-6"
          >
            {stepOptions.map((option) => {
              const selected = currentSelection.includes(option.id)
              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => togglePill(option.id)}
                  className={`px-3 py-[5px] rounded-full text-md3-label-md font-semibold border-[1.5px] transition-colors ${
                    selected
                      ? 'bg-blue text-white border-blue'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {option.label}
                </motion.button>
              )
            })}
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={handleNext}
          disabled={isSaving}
          className="w-full bg-navy text-white font-bold py-4 rounded-2xl text-md3-label-lg disabled:opacity-60"
        >
          {isSaving
            ? 'Saving…'
            : step < 2
            ? 'Next →'
            : fromProfile
            ? 'Save changes'
            : 'Save & Go to App →'}
        </motion.button>

        <button
          onClick={handleSkipStep}
          disabled={isSaving}
          className="w-full text-center text-md3-label-md text-slate-400 mt-3 disabled:opacity-40"
        >
          Skip this step
        </button>
      </div>
    </div>
  )
}
```

> **Logo path:** In Step 1 you noted the exact logo `src` from OrganizerCodeGate. Replace `/devcon-logo-white.svg` above with that path.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. Common issues:
- `user.interests` flagged as possibly undefined → verify Task 2 added `interests: number[] | null` to `Profile`
- `fadeUp` import path wrong → check `apps/member/src/lib/animation.ts` exports `fadeUp`

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/auth/InterestQuiz.tsx
git commit -m "feat(ui): add InterestQuiz 3-screen pill-grid page"
```

---

## Task 5: Add Route to Router

**Files:**
- Modify: `apps/member/src/router.tsx`

- [ ] **Step 1: Add the lazy import**

Open `apps/member/src/router.tsx`. Find the other auth page imports (look for `OrganizerCodeGate`). Add the import for InterestQuiz alongside the other non-lazy auth imports:

```ts
import InterestQuiz from './pages/auth/InterestQuiz'
```

(InterestQuiz is not lazy-loaded because it's part of the critical auth flow, same as OrganizerCodeGate.)

- [ ] **Step 2: Add the route**

In the same file, find the route for `/organizer-code-gate`. Add the `/interests` route directly after it:

```ts
{ path: '/organizer-code-gate', element: <OrganizerCodeGate /> },
{ path: '/interests', element: <InterestQuiz /> },  // ← add this line
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/router.tsx
git commit -m "feat(router): add /interests route for interest quiz"
```

---

## Task 6: Update OrganizerCodeGate Navigation

**Files:**
- Modify: `apps/member/src/pages/auth/OrganizerCodeGate.tsx`

OrganizerCodeGate currently navigates to `/home` when the user continues. Change it to navigate to `/interests` instead.

- [ ] **Step 1: Find the navigate('/home') calls**

Open `apps/member/src/pages/auth/OrganizerCodeGate.tsx`. Search for `navigate('/home'` — there may be one or two occurrences (one for "Continue as Member", potentially one after a successful code submission).

- [ ] **Step 2: Replace all occurrences**

Change every `navigate('/home'` to `navigate('/interests'`:

```ts
// Before:
navigate('/home')
// or
navigate('/home', { replace: true })

// After:
navigate('/interests')
// or
navigate('/interests', { replace: true })
```

Apply to ALL occurrences in the file. The flow becomes:
`OrganizerCodeGate → /interests → /home`

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/auth/OrganizerCodeGate.tsx
git commit -m "feat(auth): route OrganizerCodeGate to /interests before /home"
```

---

## Task 7: MemberLayout — Existing User Redirect

**Files:**
- Modify: `apps/member/src/components/MemberLayout.tsx`

Users who signed up before this feature was deployed will have `interests === null`. On their next login, `MemberLayout` should redirect them to `/interests` once.

- [ ] **Step 1: Add the redirect effect**

Open `apps/member/src/components/MemberLayout.tsx`. Find the existing auth guard effect:

```ts
useEffect(() => {
  if (!user) navigate('/sign-in', { replace: true })
}, [user, navigate])
```

Add a new `useEffect` immediately after it:

```ts
// Redirect users who haven't completed the interest quiz yet.
// interests === null means they've never been through /interests.
// interests === [] means they skipped — don't redirect again.
useEffect(() => {
  if (user && user.interests === null) {
    navigate('/interests', { replace: true })
  }
}, [user, navigate])
```

- [ ] **Step 2: Verify the import**

The `navigate` function is already imported and used in MemberLayout (it's used in the existing auth guard). No new imports needed.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `user.interests` is flagged — verify Task 2 completed the `Profile` interface update.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/components/MemberLayout.tsx
git commit -m "feat(layout): redirect users with null interests to /interests quiz"
```

---

## Task 8: Profile Page — Interests & Stack Card

**Files:**
- Modify: `apps/member/src/pages/profile/Profile.tsx`

Add an "Interests & Stack" card section between the avatar/XP card and the menu items card. The card reads directly from `useAuthStore` (no additional fetch). If all arrays are empty/null, show a prompt to complete the quiz.

- [ ] **Step 1: Add the required imports**

Open `apps/member/src/pages/profile/Profile.tsx`. Add these imports alongside the existing solar-icon-set imports:

```ts
import {
  CpuBoltOutline,           // for Tech Interests row header
  CodeOutline,              // for Tech Stack row header
  UsersGroupRoundedOutline, // for Community Role row header
  AddCircleOutline,         // for the empty-state prompt
} from 'solar-icon-set'
import { useNavigate } from 'react-router-dom'
import { useInterestsStore, type InterestOption } from '../stores/useInterestsStore'
```

> **Note:** `useNavigate` may already be imported — check before adding it again.

- [ ] **Step 2: Load options in the component**

Inside the `Profile` component body, add:

```ts
const navigate = useNavigate()
const { options, fetchOptions } = useInterestsStore()

useEffect(() => {
  void fetchOptions()
}, [fetchOptions])

// Helper: resolve an ID to its label
function labelForId(id: number): string {
  return options.find((o) => o.id === id)?.label ?? String(id)
}
```

- [ ] **Step 3: Add the card JSX**

Find where the existing profile cards are rendered. Insert the following block between the avatar/XP card and the menu card:

```tsx
{/* Interests & Stack card */}
<div className="bg-white rounded-2xl shadow-card p-4 text-left relative">
  {/* Header row */}
  <div className="flex items-center justify-between mb-3">
    <span className="text-md3-label-lg font-bold text-slate-900">
      Interests &amp; Stack
    </span>
    {(user?.interests?.length ?? 0) > 0 ||
    (user?.tech_stack?.length ?? 0) > 0 ||
    (user?.community_roles?.length ?? 0) > 0 ? (
      <button
        onClick={() => navigate('/interests?from=profile')}
        className="text-md3-label-md text-primary font-semibold"
      >
        Edit
      </button>
    ) : null}
  </div>

  {/* Empty state */}
  {user?.interests === null ||
  ((user?.interests?.length ?? 0) === 0 &&
    (user?.tech_stack?.length ?? 0) === 0 &&
    (user?.community_roles?.length ?? 0) === 0) ? (
    <button
      onClick={() => navigate('/interests?from=profile')}
      className="flex items-center gap-2 text-md3-body-md text-slate-400 w-full"
    >
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <AddCircleOutline className="w-4 h-4 text-primary" />
      </div>
      <span>Tell us about yourself</span>
    </button>
  ) : (
    <div className="flex flex-col gap-3">
      {/* Tech Interests */}
      {(user?.interests?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CpuBoltOutline className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-md3-label-sm font-bold text-slate-400 uppercase tracking-wide">
              Tech Interests
            </span>
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {(user?.interests ?? []).map((id) => (
              <span
                key={id}
                className="px-3 py-[4px] rounded-full text-md3-label-md font-semibold bg-primary/10 text-primary"
              >
                {labelForId(id)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tech Stack */}
      {(user?.tech_stack?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-green/10 flex items-center justify-center shrink-0">
              <CodeOutline className="w-3.5 h-3.5 text-green" />
            </div>
            <span className="text-md3-label-sm font-bold text-slate-400 uppercase tracking-wide">
              Tech Stack
            </span>
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {(user?.tech_stack ?? []).map((id) => (
              <span
                key={id}
                className="px-3 py-[4px] rounded-full text-md3-label-md font-semibold bg-green/10 text-green"
              >
                {labelForId(id)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Community Role */}
      {(user?.community_roles?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-amber/10 flex items-center justify-center shrink-0">
              <UsersGroupRoundedOutline className="w-3.5 h-3.5 text-amber" />
            </div>
            <span className="text-md3-label-sm font-bold text-slate-400 uppercase tracking-wide">
              Community
            </span>
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {(user?.community_roles ?? []).map((id) => (
              <span
                key={id}
                className="px-3 py-[4px] rounded-full text-md3-label-md font-semibold bg-amber/10 text-amber"
              >
                {labelForId(id)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Common issues:
- Solar icon names wrong — verify exact names in `solar-icon-set` package (`CpuBoltOutline`, `CodeOutline`, `UsersGroupRoundedOutline`, `AddCircleOutline`). If any don't exist, use `BookmarkOutline`, `TerminalOutline`, `PeopleOutline` as alternatives.
- `user?.interests` flagged — verify Task 2 updated the `Profile` interface.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/profile/Profile.tsx
git commit -m "feat(profile): add Interests & Stack card with color-coded tag sections"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck
```

Expected: exit 0, zero errors.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: exit 0. This mirrors the Vercel build exactly (`tsc -b && vite build`).

- [ ] **Step 3: Start dev server**

```bash
npm run dev:member
```

Open `http://localhost:5173`.

- [ ] **Step 4: New signup smoke test**

1. Create a new test account via `/sign-up`
2. Complete OrganizerCodeGate ("Continue as Member")
3. Confirm `/interests` loads — screen 1 shows 12 tech interest pills, no emoji, step dots show dot 1 active
4. Select 2–3 pills, tap "Next →"
5. Screen 2 loads (step dot 2 active), select 2 stack pills, tap "Next →"
6. Screen 3 loads (step dot 3 active), select 1 community role, tap "Save & Go to App →"
7. Confirm redirect to `/home`
8. Open `/profile` — confirm "Interests & Stack" card shows correct color-coded tags

- [ ] **Step 5: Skip all smoke test**

1. Sign up a second test account
2. On `/interests` screen 1, tap "Skip all"
3. Confirm immediate redirect to `/home` — no quiz shown again on next visit
4. Open `/profile` — confirm "Tell us about yourself" prompt is shown

- [ ] **Step 6: Re-entry smoke test**

1. On `/profile`, tap "Tell us about yourself" (or "Edit" if tags exist)
2. Confirm `/interests?from=profile` loads — back arrow shown top-left, "Cancel" top-right
3. Select new items, tap "Save changes"
4. Confirm redirect back to `/profile` with updated tags

- [ ] **Step 7: DB verification**

In Supabase Dashboard → SQL Editor:

```sql
SELECT id, interests, tech_stack, community_roles
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

Expected: recently created test accounts show either `NULL` (if pre-feature), `{}` (if skipped), or `{1,2,3}` style arrays for accounts that completed the quiz.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "chore: final typecheck and build verified for interest quiz"
```

---

## Self-Review Checklist (run before marking complete)

- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run build` passes with 0 errors
- [ ] No hardcoded hex colors — uses `text-primary`, `text-green`, `text-amber`, `bg-primary/10` etc.
- [ ] No emoji in JSX — pills are text-only, Solar icons only in section row headers
- [ ] `font-proxima` / `font-sans` used — no Geist references
- [ ] `whileTap` springs use `stiffness: 400, damping: 25`
- [ ] Framer Motion variants imported from `lib/animation` — `fadeUp` not redefined inline
- [ ] `animate="visible"` on stagger containers (not `"show"`)
- [ ] `interests === null` redirect in MemberLayout is guarded against loop (`/interests` is outside MemberLayout)
- [ ] One DB write total in `saveSelections` — no intermediate writes per step
