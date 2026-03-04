CREATE TABLE event_registrations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid        REFERENCES events(id),
  user_id        uuid        REFERENCES profiles(id),
  status         text        CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  qr_code_token  text        UNIQUE,
  checked_in     boolean     DEFAULT false,
  registered_at  timestamptz DEFAULT now(),
  approved_at    timestamptz,
  UNIQUE(event_id, user_id)
);
