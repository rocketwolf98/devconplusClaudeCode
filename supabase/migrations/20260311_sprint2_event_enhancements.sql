-- Sprint 2 DB migrations — run in Supabase SQL editor in order

-- ── 1. events table additions ─────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date timestamptz;

ALTER TABLE events ADD COLUMN IF NOT EXISTS category text
  CHECK (category IN ('tech_talk','hackathon','workshop','brown_bag','summit','social','networking'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility text
  CHECK (visibility IN ('public','unlisted','draft')) DEFAULT 'public';

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT true;

ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price_php integer DEFAULT 0;

ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity integer; -- null = unlimited

-- ── 2. programs table (new) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  theme_id text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO programs (name, theme_id) VALUES
  ('DEVCON+',       'devcon'),
  ('She is DEVCON', 'she'),
  ('DEVCON Kids',   'kids'),
  ('Campus',        'campus')
ON CONFLICT DO NOTHING;

-- ── 3. organizer_codes additions ─────────────────────────────────────────────
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS usage_limit integer;   -- null = unlimited
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS expires_at timestamptz; -- null = never
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id);
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS scope_type text
  CHECK (scope_type IN ('chapter','program')) DEFAULT 'chapter';

-- chapter_id becomes nullable for program-scoped codes
ALTER TABLE organizer_codes ALTER COLUMN chapter_id DROP NOT NULL;

-- ── 4. xp_tiers table (new) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  min_points integer NOT NULL,
  max_points integer,
  badge_color text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO xp_tiers (name, label, min_points, max_points, badge_color) VALUES
  ('Newcomer', 'Newcomer',  0,     499,   '#94A3B8'),
  ('Member',   'Member',    500,   1999,  '#367BDD'),
  ('Advocate', 'Advocate',  2000,  4999,  '#21C45D'),
  ('Champion', 'Champion',  5000,  9999,  '#F8C630'),
  ('Legend',   'Legend',    10000, null,  '#F97316')
ON CONFLICT DO NOTHING;

-- ── 5. Supabase Storage bucket ────────────────────────────────────────────────
-- Run this in the Supabase Storage UI or via the management API:
-- Create bucket: event-covers
--   Public: true (public read)
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--   File size limit: 5MB
