-- supabase/migrations/20260331_event_url_slugs.sql
--
-- Adds a URL-safe slug to every event for human-readable routes.
-- Format: {title-kebab-case}-{first-8-chars-of-uuid}
-- The UUID suffix guarantees global uniqueness even for identically-titled events.
--
-- DEPLOY: paste into Supabase SQL editor (CLI migration history is out of sync)

ALTER TABLE events ADD COLUMN IF NOT EXISTS slug text;

-- Auto-generate slugs for all existing rows.
-- Steps: lowercase → collapse non-alphanumeric runs to hyphens → trim leading/trailing hyphens → append UUID prefix
UPDATE events
SET slug = trim(
              both '-' from
              lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
           )
           || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

-- Enforce NOT NULL + uniqueness going forward
ALTER TABLE events ALTER COLUMN slug SET NOT NULL;
ALTER TABLE events ADD CONSTRAINT events_slug_unique UNIQUE (slug);

-- Index for fast slug lookups (EventDetail route does a .eq('slug', ...) query)
CREATE INDEX IF NOT EXISTS idx_events_slug ON events (slug);

-- SMOKE TEST (run in Supabase SQL editor after applying):
-- SELECT id, title, slug FROM events ORDER BY created_at LIMIT 10;
-- All rows should have a non-null slug like "devcon-summit-manila-a1b2c3d4"
