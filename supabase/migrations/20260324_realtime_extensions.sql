-- ============================================================
-- Migration: 20260324_realtime_extensions
-- Description: Extend the supabase_realtime publication with tables
--              needed for live UI updates, and ensure REPLICA IDENTITY
--              FULL on all realtime-enabled tables so DELETE payloads
--              carry the full row (not just the primary key).
--
-- Current publication state (from migration 014):
--   events              — REPLICA IDENTITY FULL  ✓
--   rewards             — REPLICA IDENTITY FULL  ✓
--   event_registrations — REPLICA IDENTITY FULL  ✓  (already added)
--   event_announcements — REPLICA IDENTITY DEFAULT  ← needs upgrade
--
-- What this migration adds:
--   point_transactions  — needed for live XP history updates
--   event_announcements — upgrade replica identity to FULL
-- ============================================================


-- ── ADD MISSING TABLE TO PUBLICATION ─────────────────────────────────────────

-- point_transactions: usePointsStore can subscribe for live XP updates after
-- a QR scan awards points (award-points-on-scan edge function fires INSERT).
-- Also enables live XP history refresh without manual reload.
ALTER PUBLICATION supabase_realtime ADD TABLE point_transactions;


-- ── REPLICA IDENTITY FULL UPGRADES ───────────────────────────────────────────
-- REPLICA IDENTITY FULL ensures that UPDATE and DELETE change events carry ALL
-- column values in the payload (not just the primary key).
-- Without FULL, payload.old on DELETE only contains { id: "..." }, which makes
-- it impossible to optimistically remove the correct item from client-side state.

-- event_announcements was added to the publication in migration 014 but without
-- upgrading its replica identity from the default (only PK in DELETE payload).
ALTER TABLE event_announcements REPLICA IDENTITY FULL;

-- point_transactions: allow clients to receive the full deleted row on DELETE.
ALTER TABLE point_transactions  REPLICA IDENTITY FULL;


-- ── SUMMARY OF PUBLICATION STATE AFTER THIS MIGRATION ────────────────────────
-- events              — REPLICA IDENTITY FULL  (migration 014)
-- rewards             — REPLICA IDENTITY FULL  (migration 014)
-- event_registrations — REPLICA IDENTITY FULL  (migration 014)
-- event_announcements — REPLICA IDENTITY FULL  (this migration)
-- point_transactions  — REPLICA IDENTITY FULL  (this migration)

-- SMOKE TEST (run in Supabase SQL editor after applying):
-- SELECT c.relname, c.relreplident
-- FROM pg_publication_rel pr
-- JOIN pg_class c ON c.oid = pr.prrelid
-- JOIN pg_publication p ON p.oid = pr.prpubid
-- WHERE p.pubname = 'supabase_realtime'
-- ORDER BY c.relname;
-- Expected: event_announcements=f, event_registrations=f, events=f,
--           point_transactions=f, rewards=f
