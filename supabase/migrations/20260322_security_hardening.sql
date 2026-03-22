-- Security hardening: prevent duplicate pending organizer upgrade requests
-- Prevents TOCTOU race condition in requestOrganizerUpgrade() where two
-- concurrent calls could both pass the pending-check and insert duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS organizer_upgrade_requests_one_pending_per_user
  ON organizer_upgrade_requests (user_id)
  WHERE status = 'pending';
