-- ── Missions (Bounty System) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS missions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  xp_reward   integer NOT NULL DEFAULT 100,
  difficulty  text CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  status      text CHECK (status IN ('available', 'claimed'))       DEFAULT 'available',
  github_url  text,
  created_at  timestamptz DEFAULT now()
);

-- Tracks who clicked "Start Mission"
CREATE TABLE IF NOT EXISTS mission_participants (
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (mission_id, user_id)
);

-- PR submissions — one per user per mission, upserted on resubmit
CREATE TABLE IF NOT EXISTS mission_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id   uuid REFERENCES missions(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  pr_link      text NOT NULL,
  status       text CHECK (status IN ('pending', 'approved')) DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now(),
  UNIQUE (mission_id, user_id)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_public_read"  ON missions FOR SELECT USING (true);
CREATE POLICY "missions_admin_insert" ON missions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hq_admin','super_admin'))
);
CREATE POLICY "missions_admin_update" ON missions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hq_admin','super_admin'))
);
CREATE POLICY "missions_admin_delete" ON missions FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hq_admin','super_admin'))
);

ALTER TABLE mission_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_read_all"   ON mission_participants FOR SELECT USING (true);
CREATE POLICY "participants_join_own"   ON mission_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participants_leave_own"  ON mission_participants FOR DELETE  USING (auth.uid() = user_id);

ALTER TABLE mission_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_read_all"    ON mission_submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert_own"  ON mission_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "submissions_update_own"  ON mission_submissions FOR UPDATE  USING (auth.uid() = user_id AND status = 'pending');

-- ── RPC: approve_mission_winner ──────────────────────────────────────────────
-- Called by admin. Sets mission→claimed, submission→approved, pays out XP.

CREATE OR REPLACE FUNCTION approve_mission_winner(sub_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mission_id uuid;
  v_user_id    uuid;
  v_xp_reward  integer;
  v_title      text;
BEGIN
  SELECT ms.mission_id, ms.user_id, m.xp_reward, m.title
  INTO   v_mission_id, v_user_id, v_xp_reward, v_title
  FROM   mission_submissions ms
  JOIN   missions m ON m.id = ms.mission_id
  WHERE  ms.id = sub_id AND ms.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or already processed';
  END IF;

  UPDATE mission_submissions SET status = 'approved'  WHERE id = sub_id;
  UPDATE missions              SET status = 'claimed'  WHERE id = v_mission_id;

  UPDATE profiles
  SET    spendable_points = COALESCE(spendable_points, 0) + v_xp_reward,
         lifetime_points  = COALESCE(lifetime_points,  0) + v_xp_reward
  WHERE  id = v_user_id;

  INSERT INTO point_transactions (user_id, amount, description, source)
  VALUES (v_user_id, v_xp_reward, 'Mission won: ' || v_title, 'bonus');
END;
$$;

-- Enable realtime for live participant/submission counts
ALTER PUBLICATION supabase_realtime ADD TABLE mission_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE mission_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE missions;
