# DEVCON+ — Claude Code Master Context File
> Last Updated: March 24, 2026
> Version: MVP 1.2
> Team: 2 interns + Claude Code
> Hard Deadline: April Week 1 (Cohort 3 Graduation)
> Live App: https://devconplus.vercel.app
> Lovable Prototype (UX Reference ONLY): https://devconplusrndprototype.lovable.app/onboarding

---

## 0. CRITICAL RULES FOR CLAUDE CODE

These rules are non-negotiable. Read before generating anything.

1. **Never generate Apple Sign-In code.** Auth is Google OAuth + Email/Password only via Supabase.
2. **Never mix emoji and images in the same section.** Pick one per screen/section and be consistent.
3. **Never leave placeholder text.** No `"________"`, `"Lorem ipsum"`, or empty strings — use a `<ComingSoonModal />` component for incomplete features instead.
4. **Never create dead-end navigation.** Every tap must resolve to content or a `ComingSoonModal`.
5. **Always pre-fill registration forms** from the authenticated Supabase user's profile data.
6. **Always use TypeScript strict mode.** No `any` types.
7. **The Member App and Organizer flow share ONE codebase** (`apps/member/`) but use separate layouts and route trees. Member routes are under `MemberLayout`. Organizer routes are under `OrganizerLayout` at `/organizer/*`. Do not mix their components.
8. **Jobs Board is manually seeded in Supabase for MVP.** No external API integration needed.
9. **Photos in onboarding are real chapter group photos** served from `public/photos/`. If assets are missing, use named gradient placeholders — never stock illustration components.
10. **The 2nd job listing and 2nd news post always get an orange `PROMOTED` badge.** This is a design mandate, not optional.
11. **The member app is a mobile-first web app** (React + Vite, not Expo). A `<DesktopGuard />` blocks the layout on desktop — all UI must be designed for a 390px-wide mobile viewport.
12. **Primary color is CSS-custom-property driven** (`rgb(var(--color-primary))`). Always use `text-primary`, `bg-primary`, etc. — not hardcoded hex. Only use `text-blue` / `bg-blue` when you explicitly need the non-themed DEVCON blue alias.
13. **Supabase is now live.** All stores use the real Supabase client (`apps/member/src/lib/supabase.ts`). The `MOCK_*` exports in `@devcon-plus/supabase` are kept for reference but are no longer used by the app. Always use the Supabase client for new data calls.

---

## 1. PROJECT OVERVIEW

**DEVCON+** is the "Tech Community Unified Platform" for DEVCON Philippines — the country's largest volunteer tech community with 11 nationwide chapters, 60,000+ members, and 14,000+ annual attendees.

**Tagline:** Sync. Support. Succeed.

**What this platform does:**
- Mandatory event registration tool for all 100+ annual chapter events
- Gamified volunteer engagement via the Points+ system
- Global tech career opportunities for Filipino developers
- Chapter officer management layer (Organizer flow)

**UX Benchmark:** The nmblr+ app (reference photos — dashboard, events list, points history, profile screens). Pattern-match the layout, card style, navigation feel, and points display format exactly.

---

## 2. REPOSITORY STRUCTURE

Monorepo using npm workspaces + Turbo.

```
devcon-plus/
├── apps/
│   ├── member/              # React + Vite — mobile-first web app
│   │                        # Contains BOTH member UI and organizer UI
│   │                        # (organizer is a separate route tree at /organizer/*)
│   └── landing/             # Static landing page (index.html only)
├── packages/
│   └── supabase/            # Shared DB types, mock data, client config
├── package.json             # Workspace root (framer-motion lives here)
└── turbo.json
```

---

## 3. TECH STACK

### Member App + Organizer UI (`apps/member/`)
| Concern | Choice |
|---------|--------|
| Framework | **React 19** + **Vite 7** |
| Router | **React Router DOM v7** (flat `createBrowserRouter`) |
| Styling | **Tailwind CSS v3** |
| Animation | **framer-motion** (workspace root dependency) |
| State | **Zustand v5** |
| Forms | **React Hook Form v7** + **Zod** |
| Backend client | `@supabase/supabase-js` (wired — awaiting live project) |
| QR Display | `qrcode.react` |
| QR Scanning | `@zxing/browser` + `@zxing/library` |
| Icons | `lucide-react` (only — no emoji icons in JSX) |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Language | TypeScript (strict) |
| Font | **Geist** (loaded in `index.css`) |

> This is a **web app**, not React Native. There is no Expo, no NativeWind, no RN StyleSheet. All styling is plain Tailwind CSS classes.

> A `<DesktopGuard />` wraps the app root. On non-mobile viewports it renders a "Please open on mobile" screen. All UI targets 390px width.

### Shared Package (`packages/supabase/`)
| Concern | Choice |
|---------|--------|
| Exports | TypeScript types + mock data |
| Mock data | `MOCK_PROFILE`, `MOCK_EVENTS`, `MOCK_JOBS`, `NEWS_POSTS`, etc. |
| Real client | `@supabase/supabase-js` (not yet wired) |

---

## 4. DATABASE SCHEMA

Run in order via `supabase db push` or Supabase SQL editor.

### `chapters`
```sql
CREATE TABLE chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text CHECK (region IN ('Luzon', 'Visayas', 'Mindanao')),
  created_at timestamptz DEFAULT now()
);
```

### `profiles`
```sql
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  school_or_company text,
  chapter_id uuid REFERENCES chapters(id),
  role text CHECK (role IN ('member', 'chapter_officer', 'hq_admin', 'super_admin')) DEFAULT 'member',
  avatar_url text,
  total_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### `organizer_codes`
```sql
CREATE TABLE organizer_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  chapter_id uuid REFERENCES chapters(id),
  assigned_role text CHECK (assigned_role IN ('chapter_officer', 'hq_admin')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### `events`
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES chapters(id),
  title text NOT NULL,
  description text,
  location text,
  event_date timestamptz,
  points_value integer DEFAULT 100,
  requires_approval boolean DEFAULT false,
  status text CHECK (status IN ('upcoming', 'ongoing', 'past')) DEFAULT 'upcoming',
  is_featured boolean DEFAULT false,
  is_promoted boolean DEFAULT false,
  cover_image_url text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### `event_registrations`
```sql
CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  user_id uuid REFERENCES profiles(id),
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  qr_code_token text UNIQUE,
  registered_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  UNIQUE(event_id, user_id)
);
```

> **Approval logic:** If `events.requires_approval = false` → auto-set status to `approved` and generate `qr_code_token` on insert via Edge Function. If `true` → status stays `pending` until an officer approves.

### `point_transactions`
```sql
CREATE TABLE point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  amount integer NOT NULL,
  description text NOT NULL,
  transaction_ref text UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  source text CHECK (source IN (
    'signup', 'event_attendance', 'brown_bag',
    'speaking', 'content_like', 'content_share',
    'volunteering', 'redemption', 'bonus'
  )),
  created_at timestamptz DEFAULT now()
);
```

### `rewards`
```sql
CREATE TABLE rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL,
  type text CHECK (type IN ('digital', 'physical')),
  claim_method text CHECK (claim_method IN ('onsite', 'digital_delivery')),
  image_url text,
  is_active boolean DEFAULT true,
  is_coming_soon boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### `reward_redemptions`
```sql
CREATE TABLE reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  reward_id uuid REFERENCES rewards(id),
  status text CHECK (status IN ('pending', 'claimed', 'cancelled')) DEFAULT 'pending',
  redeemed_at timestamptz DEFAULT now(),
  claimed_at timestamptz
);
```

### `jobs`
```sql
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text,
  work_type text CHECK (work_type IN ('remote', 'onsite', 'hybrid', 'full_time', 'part_time')),
  description text,
  apply_url text,
  is_promoted boolean DEFAULT false,
  is_active boolean DEFAULT true,
  posted_at timestamptz DEFAULT now()
);
```

### `news_posts`
```sql
CREATE TABLE news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  category text CHECK (category IN ('devcon', 'tech_community')),
  is_featured boolean DEFAULT false,
  is_promoted boolean DEFAULT false,
  cover_image_url text,
  author_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

---

## 5. ROLE-BASED ACCESS CONTROL

| Role | Key Capabilities |
|------|-----------------|
| `member` | Register for events, earn/redeem points, browse jobs, view own QR ticket |
| `chapter_officer` | All member + create events, approve/reject registrations, scan QR at door |
| `hq_admin` | All officer + manage rewards catalog, manage all chapters |
| `super_admin` | Full system access, role assignment, platform config |

### Organizer Gateway Flow
```
Sign Up → "DO YOU HAVE AN ORGANIZER CODE?"
  → YES: validate against organizer_codes table
         → assign role + chapter_id to profile
         → route to /organizer (OrganizerLayout)
  → NO:  default to member role
         → route to /home (MemberLayout)
```

### Key RLS Policies
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON profiles
  USING (auth.uid() = id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are public" ON events FOR SELECT USING (true);
CREATE POLICY "Officers create events" ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('chapter_officer', 'hq_admin', 'super_admin'))
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own registrations" ON event_registrations
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own points" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 6. APPLICATION SCREENS & ROUTES

### React Router (flat `createBrowserRouter` in `apps/member/src/router.tsx`)

```
/                        → SplashScreen
/onboarding              → Onboarding (4-step swipeable, real chapter photos)
/sign-in                 → SignIn
/sign-up                 → SignUp
/organizer-code-gate     → OrganizerCodeGate

— MemberLayout (floating pill bottom nav) —
/home                    → Dashboard
/events                  → EventsList
/events/:id              → EventDetail
/events/:id/register     → EventRegister
/events/:id/pending      → EventPending
/events/:id/ticket       → EventTicket
/jobs                    → JobsList
/jobs/:id                → JobDetail
/points                  → Points
/points/history          → PointsHistory
/news/:id                → NewsDetail
/rewards                 → Rewards
/profile                 → Profile
/profile/edit            → ProfileEdit
/profile/notifications   → Notifications
/profile/privacy         → Privacy

— OrganizerLayout (sidebar nav) —
/organizer                           → OrgDashboard
/organizer/events                    → OrgEventsList
/organizer/events/create             → OrgEventCreate
/organizer/events/:id                → OrgEventDetail
/organizer/events/:id/registrants    → OrgEventRegistrants
/organizer/scan                      → OrgQRScanner
/organizer/profile                   → OrgProfile
/organizer/profile/edit              → OrgProfileEdit
/organizer/profile/notifications     → Notifications (shared)
/organizer/profile/privacy           → Privacy (shared)

— AdminLayout (requires hq_admin or super_admin role) —
/admin                               → AdminDashboard (stats overview)
/admin/users                         → AdminUsers (search, role assignment)
/admin/org-codes                     → AdminOrgCodes (code generation + management)
/admin/events                        → AdminEvents (all events across chapters)
/admin/chapters                      → AdminChapters (chapter management)
/admin/upgrades                      → AdminUpgrades (CMS / upgrade requests)
/admin/kiosk                         → AdminKiosk (on-site check-in kiosk — super_admin only)
```

### Bottom Tab Navigation (MemberLayout)
```
[Home]  [Rewards]  [● Events ●]  [Jobs]  [Profile]
                        ↑
     Floating pill nav, fixed bottom-4. Events is center hero
     button (elevated circle, QrCode icon, bg-primary).
     Active state: text-primary / icon strokeWidth 2.5.
     Inactive: text-slate-400 / strokeWidth 1.8.
```

---

## 7. KEY USER FLOWS

### Onboarding (4 Screens — Swipeable)
```
Slide 1: /photos/devcon-summit-group.jpg
         "The Philippines' Largest Volunteer Tech Community"
Slide 2: /photos/devcon-15-anniversary.jpg
         "11 Chapters. 16 Years. 60,000+ Geeks for Good."
Slide 3: /photos/devcon-certificate-ceremony.jpg
         "Volunteer. Earn Points. Unlock Rewards."
Slide 4: /photos/devcon-jumpstart-internships.jpg
         "Access Global Opportunities. Level Up Your Career."

CTA: [Get Started] → /sign-up | [I have an account] → /sign-in
Each slide: DEVCON+ logomark top-left, Skip button top-right.
```

### Event Registration Lifecycle
```
Event Card → Event Detail → [Request to Join]
  → Form pre-filled: Name ✓  Email ✓  School/Company ✓
  → T&C + Privacy Consent checkbox (required)
  → Submit

IF requires_approval = false → instant QR Ticket
IF requires_approval = true  → Pending screen (Realtime subscription)
                             → Officer approves → QR Ticket
```

### QR Check-In at Venue
```
Member: shows QR Ticket screen
Officer: /organizer/scan → camera opens
Officer: scans member QR → award-points-on-scan Edge Function
  → marks checked_in
  → inserts point_transaction
  → updates profiles.total_points
Officer sees: "✓ Juan dela Cruz — 200 pts awarded"
```

### Points Earning Reference
| Activity | Points | Source Tag |
|----------|--------|-----------|
| Sign up | 500 | `signup` |
| Attend event (QR scan) | 100–300 | `event_attendance` |
| Brown Bag Session | 250 | `brown_bag` |
| Speak at event | 700 | `speaking` |
| Like content | 5 | `content_like` |
| Share content + link submit | 10–25 | `content_share` |
| Volunteer at chapter | 100–500 | `volunteering` |
| Redeem reward | negative | `redemption` |

### Points History Display Format (match nmblr+ exactly)
```
[Date]         [Description]            [+N pts]
               Transaction no. [REF]   [MM/DD/YYYY HH:MM]
```
Group by date. Redemptions show negative. End with "That's it!" empty state.

---

## 8. DASHBOARD LAYOUT (Strict — Do Not Reorder)

```
1. Sticky greeting bar (bg-primary, "Hi, {firstName}!")
   + DEVCON+ logo-horizontal top-right
   + Gradient tail that fades in on scroll (framer-motion)

2. Blue cradle (bg-primary, oval bottom border)
   XP card (white, rounded-3xl, shadow-xl):
     - "Current DEVCON Points" label
     - Star icon (gold fill) + point total
     - Gold progress bar toward next milestone
     - "Attend Our Events" CTA button

3. Quick Actions row (3 cols):
   Find Jobs → /jobs
   Volunteer → ComingSoonModal
   Redeem    → /rewards

4. Rotating banner (crossfade, 4s interval, h-44)
   #SheIsDEVCON | Kids Hour of AI | 16 Years of DEVCON
   Dot indicator below (animated width pill)

5. Events For You (max 3, See All → /events)

6. Hot Jobs — horizontal scroll carousel (max 4, See All → /jobs)
   2nd listing → orange PROMOTED badge

7. Updates — tabbed DEVCON / Tech
   2nd post in Tech tab → orange PROMOTED badge

8. XP History preview (last 4 transactions, View All → /points/history)
```

---

## 9. DESIGN SYSTEM

### Color Tokens
```
primary           → CSS var: rgb(var(--color-primary))   — driven by program theme
primary-dark      → CSS var: rgb(var(--color-primary-dark))

blue              #367BDD   legacy alias — non-themed blue (links, fallback)
blue-dark         #2962C4
blue-light        #5A9AEA
navy              #1E2A56   deep navy (banner dot indicator, dark text)
gold              #F8C630   XP bar fill, star icon fill
promoted          #F97316   ONLY for PROMOTED badge
green             #21C45D   success / positive XP
red               #EF4444   error / negative XP / sign out button
slate-50          #F8FAFC   page background
slate-100         #F1F5F9
slate-200         #E2E8F0   card borders
slate-300         #CBD5E1
slate-400         #94A3B8   muted text, inactive icons
slate-500         #64748B
slate-700         #334155
slate-900         #0F172A   primary text
```
> Tailwind slate scale has NO 600 or 800 — do not use them.

### Program Themes (user-selectable in Profile)
```
DEVCON+       id=devcon   primary=#367BDD   dark=#2962C4
She is DEVCON id=she      primary=#EC4899   dark=#DB2777
DEVCON Kids   id=kids     primary=#21C45D   dark=#16A34A
Campus        id=campus   primary=#F8C630   dark=#EAB308
```
Theme is persisted via `useThemeStore` (Zustand persist). CSS custom properties
`--color-primary` and `--color-primary-dark` are injected on the `<html>` element
by the MemberLayout on mount. Organizer routes do NOT apply program themes.

### Box Shadows
```
shadow-card     0 1px 4px rgba(0,0,0,0.07)
shadow-blue     0 4px 24px rgba(54,123,221,0.12)
shadow-primary  var(--shadow-primary)   (driven by theme)
```

### Typography (Geist font)
```
Display: 32px bold       hero headers (text-3xl font-black)
H1:      24px semibold   page titles
H2:      20px semibold   section headers (text-base font-bold)
Body:    14px regular    (text-sm)
Caption: 12px regular    timestamps, refs (text-xs / text-[10px])
```

### Spacing & Shape
```
Border radius:  rounded-xl=20px  rounded-2xl=24px  rounded-3xl=28px+
Card padding:   p-4 (standard)   p-5 (hero cards)
Page gutters:   px-4
Safe bottom:    pb-24 in scroll containers (clears floating nav)
```

### Animation (framer-motion)
```js
// apps/member/src/lib/animation.ts
staggerContainer   — staggerChildren 0.07s
cardItem           — y: 12→0, opacity: 0→1
fadeUp             — y: 8→0, opacity: 0→1
whileTap={{ scale: 0.95 }}  — standard press feedback on all buttons/cards
```

### Core Components (built — reuse everywhere)
```
<MemberLayout />         floating pill bottom nav, scroll container, auth guard
<OrganizerLayout />      sidebar nav, isOrganizerSession guard
<DesktopGuard />         blocks desktop viewports (wraps app root)
<EventCard />            dashboard + events list cards (compact prop)
<JobCard />              jobs board full card
<NewsCard />             DEVCON + Tech Community feed items
<PromotedBadge />        orange "PROMOTED" tag
<ComingSoonModal />      reusable for incomplete features
<TransactionRow />       points history list item
<StatusPill />           Pending / Approved / Rejected / You're In
<ChipBar />              horizontal scroll chip filter bar
<XPCard />               standalone XP display card
<OrgBanner />            organizer top banner strip
<ApprovalCard />         organizer approval item card
<StatusBadge />          organizer status badge
```

### Icon Rules
- Use `lucide-react` exclusively — no emoji icons in JSX
- Icon in colored container: `<div className="w-10 h-10 rounded-xl bg-primary/10 ..."><Icon className="w-5 h-5 text-primary" /></div>`
- Back navigation: `<ArrowLeft />`
- Location: `<MapPin />`
- Events center tab: `<QrCode />`
- Points: `<Star className="fill-gold text-gold" />`

---

## 10. STORES (`apps/member/src/stores/`)

```
useAuthStore.ts     — user (Profile|null), initials, signIn, signOut,
                      setOrganizerSession, updateProfile
useEventsStore.ts   — events[], registrations[], register(), getById()
useJobsStore.ts     — jobs[], getById()
usePointsStore.ts   — transactions[], totalPoints
useOrgAuthStore.ts  — organizer session state
useThemeStore.ts    — themeId, setTheme(), activeTheme()
                      persisted to localStorage as 'devcon-theme'
```

All stores are currently seeded with mock data from `@devcon-plus/supabase`.
Replace mock calls with Supabase client calls when the project is provisioned.

---

## 11. LIB UTILITIES (`apps/member/src/lib/`)

```
animation.ts    — framer-motion variants: staggerContainer, cardItem, fadeUp
constants.ts    — WORK_TYPE_LABELS, CATEGORY_LABELS
dates.ts        — formatDate.compact(), formatDate.full(), formatDate.time()
```

---

## 12. EDGE FUNCTIONS (`supabase/functions/`)

### `validate-organizer-code`
- Input: `{ code: string }`
- Returns: `{ valid: boolean, role: string, chapter_id: string }`

### `auto-approve-registration`
- Trigger: INSERT on `event_registrations`
- If `event.requires_approval = false` → set status `approved` + generate `qr_code_token`

### `award-points-on-scan`
- Input: `{ qr_code_token: string, organizer_id: string }`
- Validates token, inserts `point_transaction`, updates `profiles.total_points`
- Returns: `{ success: boolean, member_name: string, points_awarded: number }`

### `award-signup-bonus`
- Trigger: new profile created
- Inserts 500pt `signup` transaction, sets `total_points = 500`

---

## 13. SEED DATA

### All 11 Chapters
```sql
INSERT INTO chapters (name, region) VALUES
  ('Manila', 'Luzon'), ('Laguna', 'Luzon'), ('Pampanga', 'Luzon'), ('Bulacan', 'Luzon'),
  ('Cebu', 'Visayas'), ('Iloilo', 'Visayas'), ('Bacolod', 'Visayas'),
  ('Davao', 'Mindanao'), ('Cagayan de Oro', 'Mindanao'),
  ('General Santos', 'Mindanao'), ('Zamboanga', 'Mindanao');
```

### 8 Sample Jobs (manually seeded)
```sql
INSERT INTO jobs (title, company, location, work_type, is_promoted) VALUES
  ('Senior Frontend Developer', 'Accenture Philippines', 'BGC, Taguig', 'onsite', false),
  ('Blockchain Developer', 'Sui Foundation', 'Remote', 'remote', true),
  ('UI/UX Designer', 'ING Philippines', 'Makati', 'hybrid', false),
  ('Full Stack Engineer', 'Thinking Machines', 'Remote', 'remote', false),
  ('DevOps Engineer', 'Globe Telecom', 'BGC, Taguig', 'onsite', false),
  ('Mobile Developer (React Native)', 'Kumu', 'Remote', 'remote', false),
  ('Data Engineer', 'GCash', 'Mandaluyong', 'hybrid', false),
  ('Product Manager', 'Maya', 'BGC, Taguig', 'onsite', false);
```
> Sui Foundation is `is_promoted = true` → renders as 2nd listing with orange PROMOTED badge.

### Rewards Catalog
```sql
INSERT INTO rewards (name, points_cost, type, claim_method, is_coming_soon) VALUES
  ('Lanyard', 25, 'physical', 'onsite', true),
  ('Coffee Voucher', 500, 'digital', 'digital_delivery', true),
  ('DEVCON Cap', 100, 'physical', 'onsite', true),
  ('Keyboard', 250, 'physical', 'onsite', true),
  ('Headset', 950, 'physical', 'onsite', true),
  ('DEVCON Shirt', 2000, 'physical', 'onsite', true),
  ('DEVCON Mug', 2500, 'physical', 'onsite', true);
```

---

## 14. ENVIRONMENT VARIABLES

### `apps/member/.env.local`
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_APP_ENV=development
```

### `supabase/.env`
```env
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 15. CODING STANDARDS

- TypeScript strict mode — no `any`, no `@ts-ignore`
- `PascalCase.tsx` for components, `camelCase.ts` for lib/store files
- Co-locate component + types in the same folder when complex
- All Supabase calls typed with generated types (`supabase gen types typescript`)
- Every async call has loading + error + empty state
- React Hook Form + Zod for every form — no uncontrolled inputs
- Constants in `lib/constants.ts` — no magic strings/numbers inline
- No dead navigation — every route renders something
- `framer-motion` `whileTap={{ scale: 0.95 }}` on all tappable cards and buttons
- Use `motion.div` + `variants={staggerContainer}` + `variants={cardItem}` for list sections

---

## 16. BUILD COMMANDS

```bash
npm install --legacy-peer-deps        # required — peer conflict
npm run dev:member                    # Vite dev server for member app
                                      # turbo filter: @devcon-plus/member
npm run dev                           # all apps via turbo
npm run build                         # production build
npm run typecheck                     # tsc --noEmit across all packages
```

---

## 17. CURRENT BUILD STATUS (as of March 24, 2026)

### Completed
- [x] Monorepo scaffold (apps/member, packages/supabase)
- [x] Tailwind + Geist font + design tokens + CSS custom property theming
- [x] Program theme system (4 themes, CSS vars, persisted via Zustand)
- [x] Auth flow (SplashScreen, Onboarding, SignIn, SignUp, OrganizerCodeGate)
- [x] MemberLayout (floating pill nav, scroll reset, auth guard)
- [x] OrganizerLayout (sidebar nav, organizer guard)
- [x] DesktopGuard
- [x] Dashboard (cradle XP card, quick actions, rotating banner, events, jobs carousel, news tabs, XP history preview)
- [x] EventsList, EventDetail, EventRegister, EventPending, EventTicket
- [x] JobsList, JobDetail
- [x] Points, PointsHistory
- [x] Rewards (catalog grid + ComingSoonModal)
- [x] Profile (program theme selector, XP badge, menu, sign out)
- [x] ProfileEdit (photo upload), Notifications, Privacy
- [x] NewsDetail
- [x] Organizer: Dashboard, EventsList, EventCreate, EventDetail, EventRegistrants, QRScanner, Profile, ProfileEdit
- [x] Admin panel: Dashboard, Users, OrgCodes, Events, Chapters, Upgrades, Kiosk (super_admin only)
- [x] All core components (EventCard, JobCard, NewsCard, PromotedBadge, ComingSoonModal, TransactionRow, StatusPill, ChipBar, XPCard, OrgBanner, ApprovalCard, StatusBadge)
- [x] framer-motion animations across all list/card sections
- [x] Supabase project provisioned + real client wired (`apps/member/src/lib/supabase.ts`)
- [x] Real Supabase auth (signIn, signUp, Google OAuth, session persistence)
- [x] All stores migrated to real Supabase queries (auth, events, jobs, news, points, rewards, notifications)
- [x] DB schema migrations applied (001–017 + sprint/feature migrations through March 24)
- [x] Seed data seeded (chapters, jobs, rewards)
- [x] RLS policies + security hardening (IDOR hardening, rate limiting, security fixes)
- [x] Performance indexes migration written (pending apply)
- [x] Realtime extensions migration written (pending apply)
- [x] Deployed to Vercel → https://devconplus.vercel.app

### Remaining for MVP
- [ ] Apply pending migrations: `20260324_performance_indexes.sql`, `20260324_realtime_extensions.sql`, `20260324_rls_security.sql`
- [ ] Deploy Edge Functions (auto-approve, award-points-on-scan, award-signup-bonus, validate-organizer-code)
- [ ] PROMOTED badge audit (verify 2nd job + 2nd news post in live data)
- [ ] Final QA on all flows end-to-end
- [ ] Google OAuth callback URL configured in Supabase dashboard for production domain

---

## 18. OUT OF SCOPE FOR MVP

Show `<ComingSoonModal />` if user reaches any of these:

- Apple Sign-In
- Push notifications
- Reward shipping / delivery
- Partner analytics dashboard
- External Jobs API integration
- DEVCON TV / video content
- Developer Spotlight CMS
- Super Admin panel
- Multi-language support
- Volunteering registration flow
