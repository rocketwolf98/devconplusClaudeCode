-- ── Profile: new columns added in MVP hardening sprint ───────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username          text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_role      text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_chapter_id uuid REFERENCES chapters(id);

-- ── Organizer upgrade requests ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizer_upgrade_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES profiles(id) ON DELETE CASCADE,
  organizer_code text NOT NULL,
  chapter_id     uuid REFERENCES chapters(id),
  requested_role text CHECK (requested_role IN ('chapter_officer', 'hq_admin')),
  status         text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by    uuid REFERENCES profiles(id),
  created_at     timestamptz DEFAULT now(),
  reviewed_at    timestamptz
);

ALTER TABLE organizer_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Members can view their own requests
CREATE POLICY "Members view own upgrade requests"
  ON organizer_upgrade_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Members can submit requests
CREATE POLICY "Members submit upgrade requests"
  ON organizer_upgrade_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Super admins can read and update all requests
CREATE POLICY "Admins manage all upgrade requests"
  ON organizer_upgrade_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
