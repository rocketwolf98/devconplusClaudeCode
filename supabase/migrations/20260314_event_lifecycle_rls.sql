-- Allow members to cancel their own registrations
-- Members can only set status to 'cancelled' (enforced by WITH CHECK)
CREATE POLICY "Members can cancel own registrations"
  ON event_registrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (status = 'cancelled');
