-- ============================================================
-- Migration: 20260324_performance_indexes
-- Description: Covering indexes for all 19 unindexed foreign keys
--              + composite/partial indexes for common query patterns
-- References:  Supabase Performance Advisor — unindexed_foreign_keys (19 issues)
-- ============================================================


-- ── COVERING INDEXES FOR FOREIGN KEYS ────────────────────────────────────────
-- Eliminates sequential scans on FK lookups (JOIN, ON DELETE CASCADE,
-- and EXISTS subqueries in RLS policies).
-- All use IF NOT EXISTS so the migration is safe to re-run.

-- event_announcements
CREATE INDEX IF NOT EXISTS idx_event_announcements_event_id
  ON event_announcements(event_id);

CREATE INDEX IF NOT EXISTS idx_event_announcements_organizer_id
  ON event_announcements(organizer_id);

-- event_registrations — event_id is already covered by the UNIQUE(event_id, user_id)
-- constraint index. user_id alone is not indexed.
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
  ON event_registrations(user_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_chapter_id
  ON events(chapter_id);

CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON events(created_by);

-- news_posts
CREATE INDEX IF NOT EXISTS idx_news_posts_author_id
  ON news_posts(author_id);

-- organizer_codes
CREATE INDEX IF NOT EXISTS idx_organizer_codes_chapter_id
  ON organizer_codes(chapter_id);

CREATE INDEX IF NOT EXISTS idx_organizer_codes_program_id
  ON organizer_codes(program_id);

-- organizer_upgrade_requests
CREATE INDEX IF NOT EXISTS idx_organizer_upgrade_requests_user_id
  ON organizer_upgrade_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_organizer_upgrade_requests_chapter_id
  ON organizer_upgrade_requests(chapter_id);

CREATE INDEX IF NOT EXISTS idx_organizer_upgrade_requests_reviewed_by
  ON organizer_upgrade_requests(reviewed_by);

-- point_transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id
  ON point_transactions(user_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_chapter_id
  ON profiles(chapter_id);

CREATE INDEX IF NOT EXISTS idx_profiles_pending_chapter_id
  ON profiles(pending_chapter_id);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id
  ON referrals(referrer_id);

-- reward_redemptions
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id
  ON reward_redemptions(user_id);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id
  ON reward_redemptions(reward_id);

-- volunteer_applications
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_user_id
  ON volunteer_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_volunteer_applications_reviewed_by
  ON volunteer_applications(reviewed_by);


-- ── QUERY OPTIMIZATION INDEXES ────────────────────────────────────────────────
-- Derived from actual query patterns in the member app stores.

-- useEventsStore.fetchEvents(): ORDER BY event_date ASC (covers all events fetches)
CREATE INDEX IF NOT EXISTS idx_events_event_date
  ON events(event_date ASC NULLS LAST);

-- Partial index for the most common fetch: upcoming events ordered by date
-- Smaller index → faster scans on the events list page
CREATE INDEX IF NOT EXISTS idx_events_upcoming_date
  ON events(event_date ASC NULLS LAST)
  WHERE status = 'upcoming';

-- useJobsStore.fetchJobs(): WHERE is_active = true ORDER BY posted_at ASC
-- Partial index excludes inactive jobs from the index entirely
CREATE INDEX IF NOT EXISTS idx_jobs_active_posted
  ON jobs(posted_at ASC)
  WHERE is_active = true;

-- usePointsStore.loadTransactions(): WHERE user_id = ? ORDER BY created_at DESC
-- Composite covers both the filter and the sort in one index scan
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created
  ON point_transactions(user_id, created_at DESC);

-- Officer registrant view + QR scan lookup:
-- WHERE event_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_status
  ON event_registrations(event_id, status);

-- award-points-on-scan edge function: WHERE qr_code_token = ?
-- Partial index skips the large null portion (pending registrations have no token)
CREATE INDEX IF NOT EXISTS idx_event_registrations_qr_token
  ON event_registrations(qr_code_token)
  WHERE qr_code_token IS NOT NULL;

-- OrganizerCodeGate validation: WHERE code = ? AND is_active = true
CREATE INDEX IF NOT EXISTS idx_organizer_codes_code_active
  ON organizer_codes(code)
  WHERE is_active = true;

-- useNotificationsStore.fetchRecent(): WHERE event_id IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_event_announcements_created_at
  ON event_announcements(created_at DESC);

-- useNewsStore.fetchNews(): ORDER BY created_at DESC (optionally filtered by category)
CREATE INDEX IF NOT EXISTS idx_news_posts_category_created
  ON news_posts(category, created_at DESC);

-- SMOKE TEST (run in Supabase SQL editor after applying):
-- SELECT schemaname, indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
--   ORDER BY indexname;
