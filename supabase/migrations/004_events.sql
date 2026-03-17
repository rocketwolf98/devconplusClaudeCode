CREATE TABLE events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id        uuid        REFERENCES chapters(id),
  title             text        NOT NULL,
  description       text,
  location          text,
  event_date        timestamptz,
  points_value      integer     DEFAULT 100,
  requires_approval boolean     DEFAULT false,
  status            text        CHECK (status IN ('upcoming', 'ongoing', 'past')) DEFAULT 'upcoming',
  is_featured       boolean     DEFAULT false,
  is_promoted       boolean     DEFAULT false,
  cover_image_url   text,
  created_by        uuid        REFERENCES profiles(id),
  created_at        timestamptz DEFAULT now()
);
