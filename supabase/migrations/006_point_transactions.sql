CREATE TABLE point_transactions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES profiles(id),
  amount          integer     NOT NULL,
  description     text        NOT NULL,
  transaction_ref text        UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  source          text        CHECK (source IN (
    'signup', 'event_attendance', 'brown_bag',
    'speaking', 'content_like', 'content_share',
    'volunteering', 'redemption', 'bonus'
  )),
  created_at      timestamptz DEFAULT now()
);
