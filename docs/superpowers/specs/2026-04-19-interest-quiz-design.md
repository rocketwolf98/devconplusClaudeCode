# Interest Quiz — Design Spec
**Date:** 2026-04-19
**Status:** Approved
**Scope:** Step 1 — data collection only. No personalization algorithm. Foundation for the Tinder-style interest/friendship system (Phase 2).

---

## Context

DEVCON+ has no way to know what a member is interested in. This quiz collects tech interests, tech stack, and community role immediately after signup. The data is stored as integer ID arrays on `profiles`, ready to power a future Tinder-style member-matching/friendship system without any schema changes.

---

## Flow

```
SignUp (email/password)
  └─ OrganizerCodeGate
       └─ /interests  ← NEW
            └─ /home

OAuth path:
  EmailConfirm → OAuthProfileComplete
                   └─ /interests  ← NEW
                        └─ /home
```

- `/interests` is a standalone route inside the auth flow (no `MemberLayout` wrapper — same shell as `OrganizerCodeGate`)
- Navigation to `/interests` is handled inside `OrganizerCodeGate` on "Continue as Member" and after a successful organizer code submission
- Existing users who completed signup before this feature: shown the quiz once on next login. Detection: `MemberLayout`'s auth guard checks `profile.interests === null` (NULL = never been through the quiz; `[]` = went through and skipped everything). The redirect to `/interests` lives in `MemberLayout` on initialization, after `useAuthStore` resolves the session.

---

## Screens

Three sequential sub-steps rendered within the single `/interests` route. A step index (0 → 1 → 2) is local state — no separate routes per step.

### Screen 1 — Tech Interests
- Header: `bg-blue`, DEVCON+ wordmark, step dots (1 of 3 active), "Skip all" link
- Body: `bg-slate-50 rounded-t-3xl`, pill grid
- Title: "What excites you?" / sub: "Pick your tech interests"
- Pills (12): AI / ML · Web Dev · DevOps · Cybersecurity · Mobile · Data Science · Cloud · Blockchain · UI / UX · Game Dev · Open Source · IoT
- No emoji in pill labels — text only (`solar-icon-set` icons are not used inside pills; the pill label IS the full content)
- CTA: "Next →" (`bg-navy rounded-2xl`)
- Secondary: "Skip this step" (slate-400 text, clears local selection state for this step, advances to screen 2 — no DB write yet)

### Screen 2 — Tech Stack
- Same shell, step dots (2 of 3 active)
- Title: "Your stack?" / sub: "Languages & frameworks you use"
- Pills (12): React · Vue · Angular · TypeScript · JavaScript · Python · Go · Java · Flutter · Kotlin · Rust · PHP
- Text only — no emoji
- CTA: "Next →"
- Secondary: "Skip this step"

### Screen 3 — Community Role
- Same shell, step dots (3 of 3 active)
- Title: "Your role?" / sub: "How you give back to the community"
- Pills (8): Speaker · Volunteer · Mentor · Blogger · Hackathon · Student · Hiring · Job Seeker
- Text only — no emoji
- CTA: "Save & Go to App →" — triggers save then navigates to `/home`
- Secondary: "Skip this step" — clears local community_roles state, then triggers the same save + navigate as the CTA (one single DB write for all three arrays at this point)

### "Skip all" behaviour
Appears top-right on every screen. Tapping it saves all three arrays as `[]` (not NULL — the user has been through the quiz) and navigates immediately to `/home`. No confirmation required. This is a single DB write.

### Save timing
There is **one DB write total**, triggered only when the user exits screen 3 (via CTA, "Skip this step", or "Skip all"). Per-screen "Skip this step" on screens 1 and 2 only clears that screen's local state and advances the step counter — no intermediate writes.

### Step dots
Active dot: wider pill (`w-6`), white fill. Inactive: `w-[18px]`, `bg-white/30`. Same pattern as existing dashboard rotating banner.

### Pill interaction
- Unselected: `bg-white border border-slate-200 text-slate-700`
- Selected: `bg-blue text-white border-blue`
- `whileTap={{ scale: 0.95 }}` spring (`stiffness: 400, damping: 25`) — matches existing button spring
- No minimum selection required

---

## Data Model

### New table: `interest_options`

```sql
CREATE TABLE interest_options (
  id       serial PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('interest', 'tech_stack', 'community_role')),
  label    text NOT NULL,
  emoji    text
);
```

Seeded with all 32 options across the three screens (see seed values in Section: Seed Data below).

The `emoji` column is kept for future use (push notifications, Kotlin Multiplatform native app). The web UI renders only `label` text — never the emoji field in JSX.

### Columns added to `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN interests       integer[] DEFAULT NULL,
  ADD COLUMN tech_stack      integer[] DEFAULT NULL,
  ADD COLUMN community_roles integer[] DEFAULT NULL;
-- NULL = user has never been through the quiz (triggers the one-time redirect)
-- '{}'  = user went through the quiz and skipped or selected nothing
-- '{1,2,3}' = user made selections

CREATE INDEX profiles_interests_gin       ON profiles USING GIN (interests);
CREATE INDEX profiles_tech_stack_gin      ON profiles USING GIN (tech_stack);
CREATE INDEX profiles_community_roles_gin ON profiles USING GIN (community_roles);
```

GIN indexes enable the future `interests && ARRAY[1,2]` overlap queries for Tinder-style matching without any schema changes.

### RLS

`interest_options` is public read, no write for members (seeded by admin only):
```sql
ALTER TABLE interest_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interest_options public read" ON interest_options FOR SELECT USING (true);
```

The three new `profiles` columns are covered by the existing `"Users manage own profile"` RLS policy.

---

## Seed Data

```sql
-- Interests (category = 'interest')
INSERT INTO interest_options (category, label, emoji) VALUES
  ('interest', 'AI / ML',      '🤖'),
  ('interest', 'Web Dev',      '🌐'),
  ('interest', 'DevOps',       '⚙️'),
  ('interest', 'Cybersecurity','🔐'),
  ('interest', 'Mobile',       '📱'),
  ('interest', 'Data Science', '📊'),
  ('interest', 'Cloud',        '☁️'),
  ('interest', 'Blockchain',   '⛓️'),
  ('interest', 'UI / UX',      '🎨'),
  ('interest', 'Game Dev',     '🎮'),
  ('interest', 'Open Source',  '🔓'),
  ('interest', 'IoT',          '🔌');

-- Tech stack (category = 'tech_stack')
INSERT INTO interest_options (category, label, emoji) VALUES
  ('tech_stack', 'React',      '⚛️'),
  ('tech_stack', 'Vue',        '🟢'),
  ('tech_stack', 'Angular',    '🔺'),
  ('tech_stack', 'TypeScript', '🔷'),
  ('tech_stack', 'JavaScript', '🟡'),
  ('tech_stack', 'Python',     '🐍'),
  ('tech_stack', 'Go',         '🐹'),
  ('tech_stack', 'Java',       '☕'),
  ('tech_stack', 'Flutter',    '🦋'),
  ('tech_stack', 'Kotlin',     '🤖'),
  ('tech_stack', 'Rust',       '🦀'),
  ('tech_stack', 'PHP',        '🐘');

-- Community roles (category = 'community_role')
INSERT INTO interest_options (category, label, emoji) VALUES
  ('community_role', 'Speaker',    '🎤'),
  ('community_role', 'Volunteer',  '🤝'),
  ('community_role', 'Mentor',     '🧑‍🏫'),
  ('community_role', 'Blogger',    '📝'),
  ('community_role', 'Hackathon',  '💻'),
  ('community_role', 'Student',    '🌱'),
  ('community_role', 'Hiring',     '🏢'),
  ('community_role', 'Job Seeker', '🔍');
```

---

## Store: `useInterestsStore.ts`

New Zustand store at `apps/member/src/stores/useInterestsStore.ts`.

```ts
interface InterestOption { id: number; category: string; label: string; emoji: string | null }
interface InterestsStore {
  options: InterestOption[]          // all rows from interest_options, loaded once
  fetchOptions: () => Promise<void>
  saveSelections: (
    interests: number[],
    techStack: number[],
    communityRoles: number[]
  ) => Promise<void>
}
```

- `fetchOptions()` queries `interest_options` ordered by `id`, stores result in Zustand. Called once on mount of the `/interests` page — no realtime subscription needed (seed data never changes).
- `saveSelections()` issues a single `profiles` UPDATE for the authenticated user. On success, calls `useAuthStore.getState().applyProfile()` to sync the store with the new column values.
- Options are grouped by category client-side: `options.filter(o => o.category === 'interest')` etc.

---

## Profile Page Changes

**File:** `apps/member/src/pages/profile/Profile.tsx`

Add an "Interests & Stack" card section between the avatar card and the menu items card. Reads directly from `useAuthStore` profile (no additional fetch):

```
┌─ Interests & Stack ──────────────────────── Edit → ┐
│  AI / ML   Web Dev   Mobile                         │  ← blue pills (bg-primary/10 text-primary)
│  React     TypeScript                               │  ← green pills (bg-green/10 text-green)
│  Speaker                                            │  ← amber pills (bg-amber/10 text-amber)
└─────────────────────────────────────────────────────┘
```

- No emoji anywhere — text labels only. `solar-icon-set` icons are used only in the section header row (e.g. `<CpuBoltOutline />` before "Interests", `<CodeOutline />` before "Stack", `<UsersGroupRoundedOutline />` before "Community") — icon in `bg-primary/10` container per visual-consistency rules, but these are row-level headers, not inside the pills.
- If all three arrays are empty: show a "Tell us about yourself →" prompt that links to `/interests`
- "Edit →" link navigates to `/interests?from=profile` (quiz is re-entrant — existing selections are pre-filled)
- Tag colors: interests = `bg-primary/10 text-primary`, stack = `bg-green/10 text-green`, roles = `bg-amber/10 text-amber` (Tailwind aliases, never hardcoded hex)

---

## ProfileEdit / Re-entry

`/interests` is re-entrant. On mount, the page reads the user's current `interests`, `tech_stack`, and `community_roles` from `useAuthStore` and pre-fills the pill selections. Saving overwrites the previous values.

The "Edit interests →" link on Profile navigates to `/interests?from=profile`. On mount, `InterestQuiz` reads this param: if present, show a back arrow (→ `/profile`) in the top-left instead of "Skip all". "Skip all" is replaced with "Cancel" which navigates back to `/profile` without saving.

---

## TypeScript / DB Types

After applying the migration, regenerate types:
```bash
supabase gen types typescript --project-id <id> > packages/supabase/src/database.types.ts
```

Update `packages/supabase/src/types.ts` `Profile` interface to add:
```ts
interests:       number[]
tech_stack:      number[]
community_roles: number[]
```

---

## Router

Add to `apps/member/src/router.tsx` (outside `MemberLayout`, alongside other auth routes):
```ts
{ path: '/interests', element: <InterestQuiz /> }
```

`InterestQuiz` is the new page component at `apps/member/src/pages/auth/InterestQuiz.tsx`.

---

## Verification

1. **New signup flow:** Create a new account → complete OrganizerCodeGate → confirm `/interests` loads with empty pills → select a few → tap "Next" through all 3 screens → confirm redirect to `/home`
2. **Skip all:** On screen 1, tap "Skip all" → confirm immediate redirect to `/home`, profile has `interests=[], tech_stack=[], community_roles=[]`
3. **Skip per screen:** Skip screen 1, pick items on screens 2 & 3 → confirm only the skipped screen saves `[]`
4. **Profile display:** After completing quiz, open `/profile` → confirm "Interests & Stack" section shows correct color-coded tags
5. **Re-entry / edit:** Tap "Edit →" on Profile → confirm `/interests` pre-fills previously selected pills → change selections → save → confirm profile card updates
6. **Existing users:** Sign in with an account that has all three arrays empty → confirm quiz is shown once before `/home`
7. **DB check:** `SELECT interests, tech_stack, community_roles FROM profiles WHERE id = '<uid>';` — confirm saved IDs match selected pills

---

## Out of Scope (Phase 2)

- Personalization: no event/job recommendations based on interests yet
- Matching: no "members like you" or friend suggestions
- Tinder-style swipe UI (this is the pill-grid Step 1 foundation)
- Analytics: no dashboard showing interest distribution across chapters
