CREATE TABLE chapters (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  region     text        CHECK (region IN ('Luzon', 'Visayas', 'Mindanao')),
  created_at timestamptz DEFAULT now()
);
