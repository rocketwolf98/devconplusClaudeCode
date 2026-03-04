CREATE TABLE rewards (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text,
  points_cost   integer     NOT NULL,
  type          text        CHECK (type IN ('digital', 'physical')),
  claim_method  text        CHECK (claim_method IN ('onsite', 'digital_delivery')),
  image_url     text,
  is_active     boolean     DEFAULT true,
  is_coming_soon boolean    DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
