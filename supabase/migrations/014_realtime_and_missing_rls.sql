-- ── REALTIME PUBLICATION ─────────────────────────────────────────────────────
-- Without this, no INSERT/UPDATE/DELETE events are broadcast to clients.
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE rewards;

-- REPLICA IDENTITY FULL ensures DELETE payloads include all columns
-- so clients receive the deleted row's id reliably.
ALTER TABLE events  REPLICA IDENTITY FULL;
ALTER TABLE rewards REPLICA IDENTITY FULL;


-- ── MISSING RLS POLICIES ─────────────────────────────────────────────────────

-- events: officers need DELETE
CREATE POLICY "Officers can delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );

-- rewards: officers need UPDATE (soft-delete via is_active = false)
--          INSERT and DELETE for future add/remove flows
CREATE POLICY "Officers can update rewards"
  ON rewards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );

CREATE POLICY "Officers can insert rewards"
  ON rewards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );

CREATE POLICY "Officers can delete rewards"
  ON rewards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );
