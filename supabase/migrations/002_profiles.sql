CREATE TABLE profiles (
  id                 uuid        REFERENCES auth.users PRIMARY KEY,
  full_name          text        NOT NULL,
  email              text        UNIQUE NOT NULL,
  school_or_company  text,
  chapter_id         uuid        REFERENCES chapters(id),
  role               text        CHECK (role IN ('member', 'chapter_officer', 'hq_admin', 'super_admin')) DEFAULT 'member',
  avatar_url         text,
  total_points       integer     DEFAULT 0,
  created_at         timestamptz DEFAULT now()
);
