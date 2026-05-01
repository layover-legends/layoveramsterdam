-- =========================================================================
-- Add meta_title and meta_description to destinations and tours.
-- These override the auto-generated fallback (name + description) in <head>.
-- Google truncates titles at ~70 chars and descriptions at ~160 chars.
-- Idempotent: safe to re-run.
-- =========================================================================

ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS meta_title       TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS meta_title       TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- CHECK constraints cap values at Google's truncation thresholds.
ALTER TABLE public.destinations
  DROP CONSTRAINT IF EXISTS destinations_meta_title_len,
  ADD CONSTRAINT destinations_meta_title_len
    CHECK (meta_title IS NULL OR char_length(meta_title) <= 70),
  DROP CONSTRAINT IF EXISTS destinations_meta_description_len,
  ADD CONSTRAINT destinations_meta_description_len
    CHECK (meta_description IS NULL OR char_length(meta_description) <= 160);

ALTER TABLE public.tours
  DROP CONSTRAINT IF EXISTS tours_meta_title_len,
  ADD CONSTRAINT tours_meta_title_len
    CHECK (meta_title IS NULL OR char_length(meta_title) <= 70),
  DROP CONSTRAINT IF EXISTS tours_meta_description_len,
  ADD CONSTRAINT tours_meta_description_len
    CHECK (meta_description IS NULL OR char_length(meta_description) <= 160);

-- Sanity check.
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'destinations'
       AND column_name IN ('meta_title','meta_description')) AS dest_cols_added,
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'tours'
       AND column_name IN ('meta_title','meta_description')) AS tours_cols_added;
-- Expect: 2, 2
