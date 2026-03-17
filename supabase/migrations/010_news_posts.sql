CREATE TABLE news_posts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  body            text,
  category        text        CHECK (category IN ('devcon', 'tech_community')),
  is_featured     boolean     DEFAULT false,
  is_promoted     boolean     DEFAULT false,
  cover_image_url text,
  author_id       uuid        REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now()
);
