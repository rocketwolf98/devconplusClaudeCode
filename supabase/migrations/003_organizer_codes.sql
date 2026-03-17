CREATE TABLE organizer_codes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        UNIQUE NOT NULL,
  chapter_id    uuid        REFERENCES chapters(id),
  assigned_role text        CHECK (assigned_role IN ('chapter_officer', 'hq_admin')),
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
