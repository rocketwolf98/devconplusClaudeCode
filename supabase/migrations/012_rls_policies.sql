-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');


-- chapters (public read — everyone can list chapters)
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chapters are public"
  ON chapters FOR SELECT
  USING (true);


-- organizer_codes (officers validate their own codes)
ALTER TABLE organizer_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active codes are readable by authenticated users"
  ON organizer_codes FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);


-- events (public read, officers can insert/update)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are public"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Officers can create events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );

CREATE POLICY "Officers can update their chapter events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );


-- event_registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own registrations"
  ON event_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Officers view registrations for their events"
  ON event_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_registrations.event_id
        AND e.chapter_id = p.chapter_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );

CREATE POLICY "Members can register for events"
  ON event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Officers can update registration status"
  ON event_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_registrations.event_id
        AND e.chapter_id = p.chapter_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );

CREATE POLICY "Service role can manage all registrations"
  ON event_registrations FOR ALL
  USING (auth.role() = 'service_role');


-- point_transactions
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions"
  ON point_transactions FOR ALL
  USING (auth.role() = 'service_role');


-- rewards (public read)
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rewards are public"
  ON rewards FOR SELECT
  USING (true);


-- reward_redemptions
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON reward_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can redeem rewards"
  ON reward_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- jobs (public read)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs are public"
  ON jobs FOR SELECT
  USING (true);


-- news_posts (public read)
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News posts are public"
  ON news_posts FOR SELECT
  USING (true);
