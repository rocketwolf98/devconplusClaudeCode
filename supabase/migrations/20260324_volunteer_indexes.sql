-- ============================================================
-- Missing indexes for volunteer_applications
-- Best practice: index all FK columns (schema-foreign-key-indexes)
-- Best practice: partial index for the hot query path (query-partial-indexes)
-- ============================================================

-- FK index: organizer chapter-scoped JOIN goes through event_id
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_event_id
  ON volunteer_applications(event_id);

-- Partial index: organizer pending-approval filter is the most common read path
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_pending
  ON volunteer_applications(event_id, applied_at DESC)
  WHERE status = 'pending';
