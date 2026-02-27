# DEVCON+ — Claude Code Master Context File
> Last Updated: February 25, 2026
> Version: MVP 1.0
> Team: 2 interns + Claude Code
> Hard Deadline: April Week 1 (Cohort 3 Graduation)
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
7. **The Organizer PWA and Member App are two separate codebases** sharing one Supabase project. Do not mix their routing or components.
8. **Jobs Board is manually seeded in Supabase for MVP.** No external API integration needed.
9. **Photos in onboarding are real chapter group photos.** If assets are missing, use named gradient placeholders — never stock illustration components.
10. **The 2nd job listing and 2nd news post always get an orange `PROMOTED` badge.** This is a design mandate, not optional.

---

## 1. PROJECT OVERVIEW

**DEVCON+** is the "Tech Community Unified Platform" for DEVCON Philippines — the country's largest volunteer tech community with 11 nationwide chapters, 60,000+ members, and 14,000+ annual attendees.

**Tagline:** Sync. Support. Succeed.

**What this platform does:**
- Mandatory event registration tool for all 100+ annual chapter events
- Gamified volunteer engagement via the Points+ system
- Global tech career opportunities for Filipino developers
- Chapter officer management layer (Organizer PWA)

**UX Benchmark:** The nmblr+ app (reference photos — dashboard, events list, points history, profile screens). Pattern-match the layout, card style, navigation feel, and points display format exactly.

---

## 2. REPOSITORY STRUCTURE

Monorepo using npm workspaces. Both apps share Supabase type definitions.

```
devcon-plus/
├── apps/
│   ├── member/              # React Native (Expo) — mobile app
│   └── organizer/           # React + Vite — browser PWA
├── packages/
│   └── supabase/            # shared DB types, client config, migrations
├── package.json             # workspace root
└── turbo.json
```

---

## 3. TECH STACK

### Member App (`apps/member/`)
| Concern | Choice |
|---------|--------|
| Framework | React Native via **Expo SDK 51+** |
| Router | **Expo Router v3** (file-based) |
| Styling | **NativeWind v4** (Tailwind for RN) |
| State | **Zustand** |
| Forms | **React Hook Form** + **Zod** |
| Backend client | `@supabase/supabase-js` |
| QR Display | `react-native-qrcode-svg` |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Image handling | `expo-image` |
| Language | TypeScript (strict) |

### Organizer PWA (`apps/organizer/`)
| Concern | Choice |
|---------|--------|
| Framework | **React 18** + **Vite** |
| Router | **React Router v6** |
| Styling | **Tailwind CSS v3** |
| State | **Zustand** |
| Forms | **React Hook Form** + **Zod** |
| Backend client | `@supabase/supabase-js` |
| QR Scanner | `@zxing/browser` (getUserMedia — Chrome/Android primary) |
| Language | TypeScript (strict) |

> ⚠️ QR scanning in the Organizer PWA uses `getUserMedia`. Works on Chrome (desktop + Android). iOS Safari has limitations — advise officers to use Chrome on Android or desktop for door scanning.

### Backend (Shared)
| Concern | Choice |
|---------|--------|
| Platform | **Supabase** (new project — not yet provisioned) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Storage | Supabase Storage (chapter photos, assets) |
| Serverless | Supabase Edge Functions (Deno/TypeScript) |
| Realtime | Supabase Realtime (registration status updates) |

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

> **Approval logic:** If `events.requires_approval = false` → auto-set status to `approved` and generate `qr_code_token` on insert via Edge Function. If `true` → status stays `pending` until an officer approves in the Organizer PWA.

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

> **MVP note:** Jobs are manually seeded. No external API. Seed 8–10 realistic tech roles. The Sui-related role has `is_promoted = true` and renders as the 2nd listing with an orange PROMOTED badge.

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
         → route to Organizer PWA (separate URL)
  → NO:  default to member role
         → route to Member App (React Native)
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

### Member App — Expo Router
```
app/
├── _layout.tsx
├── (auth)/
│   ├── onboarding.tsx         # 4-step swipeable intro
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── organizer-code.tsx     # "DO YOU HAVE AN ORGANIZER CODE?"
└── (tabs)/
    ├── _layout.tsx            # 5-tab bottom navigator
    ├── index.tsx              # Dashboard
    ├── events/
    │   ├── index.tsx          # Events list (For You + All + Chapter filter)
    │   ├── [id].tsx           # Event detail
    │   ├── [id]/register.tsx  # Registration form (pre-filled)
    │   ├── [id]/pending.tsx   # Pending approval screen
    │   └── [id]/ticket.tsx    # QR Ticket
    ├── jobs/
    │   ├── index.tsx          # Jobs board
    │   └── [id].tsx           # Job detail → Apply Now
    ├── points/
    │   ├── index.tsx          # XP bar + earn options
    │   └── history.tsx        # Transaction log
    ├── rewards/
    │   └── index.tsx          # Perks catalog (ComingSoonModal on tap for MVP)
    └── profile/
        ├── index.tsx
        ├── edit.tsx
        ├── notifications.tsx
        └── privacy.tsx
```

### Bottom Tab Navigation
```
[Events]  [Jobs]  [● Home ●]  [Points]  [Profile]
                      ↑
              Center hero button — Dashboard
```

### Organizer PWA — React Router v6
```
src/pages/
├── Login.tsx
├── Dashboard.tsx              # Pending approvals + ongoing events summary
├── events/
│   ├── EventsList.tsx
│   ├── EventCreate.tsx
│   ├── EventDetail.tsx
│   └── EventRegistrants.tsx  # Approve / Reject list
├── scan/
│   └── QRScanner.tsx         # Camera QR scanner → award points
└── profile/
    └── Profile.tsx
```

---

## 7. KEY USER FLOWS

### Onboarding (4 Screens — Swipeable)
```
Screen 1: DEVCON logo + chapter hero photo (gradient placeholder until assets arrive)
          "The Philippines' Largest Volunteer Tech Community"
Screen 2: Chapter collage / map
          "11 Chapters. 16 Years. 60,000+ Geeks for Good."
Screen 3: Points+ visual
          "Volunteer. Earn Points. Unlock Rewards."
Screen 4: Globe / jobs visual
          "Access Global Opportunities. Level Up Your Career."

CTA: [Get Started] → Sign Up | [I have an account] → Sign In
```

### Event Registration Lifecycle
```
Event Card → Event Detail → [Request to Join]
  → Form pre-filled: Name ✓  Email ✓  School/Company ✓
  → T&C + Privacy Consent checkbox (required)
  → Submit

IF requires_approval = false → instant QR Ticket → "You're In! 🎉"
IF requires_approval = true  → Pending screen (Realtime subscription)
                             → Officer approves in Organizer PWA
                             → Status updates live → "You're In! 🎉" → QR Ticket
```

### QR Check-In at Venue
```
Member: shows QR Ticket screen
Officer: Organizer PWA → Scan QR → camera opens
Officer: scans member QR → token sent to award-points-on-scan Edge Function
  → marks registration checked_in
  → inserts point_transaction (amount = event.points_value)
  → updates profiles.total_points
Officer sees: "✓ Juan dela Cruz — 200 pts awarded"
Member app updates via Supabase Realtime
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
Group by date. Redemptions show negative (`-2850 points`). End with "That's it!" empty state.

---

## 8. DASHBOARD LAYOUT (Strict — Do Not Reorder)

```
1. Dynamic rotating hero header
   Cycles: #SHEISDEVCON | KIDS HOUR OF AI | 16 YEARS ANNIV
   Auto-rotates every 4 seconds

2. XP Progress Bar
   "You have [N] points"
   Progress toward next reward tier
   Default mockup state: 100 pts
   [Redeem Now] button

3. Events For You (simple cards, max 3, [See All])
   Filtered by user's chapter_id

4. Hot Jobs (max 3, [See All])
   2nd listing → orange PROMOTED badge

5. DEVCON Updates (category: devcon)
   Official news + program highlights

6. TECH COMMUNITY Updates (category: tech_community)
   Wider industry + partner news
   2nd post → orange PROMOTED badge
```

---

## 9. DESIGN SYSTEM

### Color Tokens
```
Primary:      #1E2A4A   deep navy — buttons, headers, active nav
Accent:       #3B82F6   DEVCON blue — links, progress fill
Promoted:     #F97316   orange — ONLY for PROMOTED badge
Background:   #F8FAFC   off-white
Card:         #FFFFFF
Text Primary: #0F172A
Text Muted:   #64748B
Success:      #22C55E   "You're In" states
Warning:      #EAB308   pending states
Error:        #EF4444   rejected states
```

### Core Components (build first, reuse everywhere)
```
<PointsBadge />       current XP + star icon (nmblr pattern)
<XPProgressBar />     progress toward next reward
<EventCard />         dashboard, events list, For You section
<JobCard />           dashboard Hot Jobs + Jobs Board
<NewsCard />          DEVCON + Tech Community feeds
<PromotedBadge />     orange tag — overlay on cards
<QRTicket />          full-screen QR with event details
<ComingSoonModal />   reusable — incomplete features
<TransactionRow />    points history list item (nmblr pattern)
<StatusPill />        Pending / Approved / Rejected / You're In
<ChapterFilterBar />  horizontal scroll — 11 chapters
```

### Typography
```
Display:  32px bold      hero headers
H1:       24px semibold
H2:       20px semibold
Body:     14px regular
Caption:  12px regular   transaction refs, timestamps
```

---

## 10. EDGE FUNCTIONS (`supabase/functions/`)

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

## 11. SEED DATA

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

## 12. ENVIRONMENT VARIABLES

### `apps/member/.env.local`
```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
EXPO_PUBLIC_APP_ENV=development
```

### `apps/organizer/.env.local`
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

## 13. CODING STANDARDS

- TypeScript strict mode on both apps — no `any`, no `@ts-ignore`
- `PascalCase.tsx` for components, `kebab-case.tsx` for Expo Router routes
- Co-locate component + styles + types in the same folder
- All Supabase calls typed with generated types (`supabase gen types typescript`)
- Every async call has loading + error + empty state
- React Hook Form + Zod for every form — no uncontrolled inputs
- Constants files for all magic values: `constants/points.ts`, `constants/roles.ts`, `constants/chapters.ts`
- No dead navigation — every route renders something

---

## 14. SPRINT PLAN

> Dev A → Member App (React Native) | Dev B → Organizer PWA (Vite) | Claude Code → assists both

### Week 1 — Foundation
- [ ] Provision Supabase project + configure Google OAuth
- [ ] Run schema migrations + seed data
- [ ] Scaffold monorepo (apps/member, apps/organizer, packages/supabase)
- [ ] Generate + share Supabase TypeScript types
- [ ] Deploy `award-signup-bonus` Edge Function
- [ ] **[Parallel — non-blocking]** Asset Sprint: collect chapter group photos from leads
- [ ] Expo init + NativeWind setup (Dev A)
- [ ] Vite + React + Tailwind init (Dev B)
- [ ] 4-step onboarding with gradient placeholders (Dev A)
- [ ] Organizer login + dashboard shell (Dev B)

### Week 2 — Auth & Role Gateway
- [ ] Google OAuth + email auth on both apps
- [ ] Organizer Code screen + validation (Member App)
- [ ] Auth guards + role-based routing (both apps)
- [ ] Profile auto-creation + 500pt signup bonus trigger
- [ ] Bottom tab navigator shell — Member App

### Week 3 — Engagement Hub
- [ ] Dashboard: rotating hero, XP bar, Events For You, Hot Jobs, news feeds (Dev A)
- [ ] Events list + chapter filter + For You tab (Dev A)
- [ ] Organizer: event list, create form, registrants list + approve/reject (Dev B)

### Week 4 — Events, Jobs, QR
- [ ] Event detail + registration form (pre-filled) + Pending screen + QR Ticket (Dev A)
- [ ] Jobs board: search + filter + detail + Apply Now (Dev A)
- [ ] Tech Community section on Events page (Dev A)
- [ ] QR Scanner screen + award-points-on-scan integration (Dev B)

### Week 5 — Polish & Delivery
- [ ] Swap gradient placeholders with real chapter photos (if assets received)
- [ ] Points History: full transaction log + date grouping + empty state
- [ ] Rewards catalog grid + ComingSoonModal
- [ ] Profile settings: edit, notifications, privacy
- [ ] PROMOTED badge audit (2nd job + 2nd news post)
- [ ] Remove all placeholder text from every screen
- [ ] Emoji/image consistency audit per section
- [ ] RLS policy review + security check
- [ ] Final QA on both apps
- [ ] Deploy: Expo EAS Build (member) + Vercel (organizer PWA)

---

## 15. OUT OF SCOPE FOR MVP

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
