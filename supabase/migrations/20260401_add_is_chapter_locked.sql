-- Add chapter-lock column to events (DEFAULT true for new events; existing rows get NULL = unlocked)
ALTER TABLE events ADD COLUMN is_chapter_locked boolean DEFAULT true;

-- RLS policy: block cross-chapter registration for locked events.
-- Uses a subquery to check the event's lock status and chapter against the registrant's chapter.
-- NULL is_chapter_locked is treated as unlocked (backwards compat for existing events).
CREATE POLICY "Block cross-chapter registration for locked events"
  ON event_registrations
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_id
        AND e.is_chapter_locked = true
        AND e.chapter_id IS DISTINCT FROM p.chapter_id
    )
  );
