CREATE TABLE reward_redemptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES profiles(id),
  reward_id   uuid        REFERENCES rewards(id),
  status      text        CHECK (status IN ('pending', 'claimed', 'cancelled')) DEFAULT 'pending',
  redeemed_at timestamptz DEFAULT now(),
  claimed_at  timestamptz
);
