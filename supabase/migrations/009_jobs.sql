CREATE TABLE jobs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  company     text        NOT NULL,
  location    text,
  work_type   text        CHECK (work_type IN ('remote', 'onsite', 'hybrid', 'full_time', 'part_time')),
  description text,
  apply_url   text,
  is_promoted boolean     DEFAULT false,
  is_active   boolean     DEFAULT true,
  posted_at   timestamptz DEFAULT now()
);
