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
