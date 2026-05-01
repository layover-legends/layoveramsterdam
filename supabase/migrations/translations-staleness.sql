-- =========================================================================
-- Phase 6 prep — staleness tracking on translations.
--
-- Adds the columns needed to detect when a translation has drifted out of
-- sync with its source. The pattern:
--
--   1. When a translation is written, store sha256(source_text) in source_hash.
--   2. When a source row changes, recompute the hash for every (entity, field)
--      and compare. If different, set is_stale=true.
--   3. SEO dashboard surfaces stale rows the same way it surfaces missing ones.
--   4. Bulk-translate script skips human-reviewed non-stale rows by default,
--      re-translates AI rows that are stale.
--
-- Also adds review-tracking columns so we can prove which rows a human signed
-- off on, with a timestamp.
--
-- Idempotent: safe to re-run.
-- =========================================================================

ALTER TABLE public.translations
  ADD COLUMN IF NOT EXISTS source_hash    TEXT,
  ADD COLUMN IF NOT EXISTS is_stale       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS translated_by  TEXT NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_locale  TEXT;

-- translated_by must be one of: 'human', 'ai', 'imported'
ALTER TABLE public.translations
  DROP CONSTRAINT IF EXISTS translations_translated_by_check,
  ADD CONSTRAINT translations_translated_by_check
    CHECK (translated_by IN ('human', 'ai', 'imported'));

-- Read-path indexes for the dashboard queries.
CREATE INDEX IF NOT EXISTS idx_translations_stale
  ON public.translations (is_stale) WHERE is_stale = TRUE;

CREATE INDEX IF NOT EXISTS idx_translations_by_source
  ON public.translations (translated_by);

-- Backfill: every row currently in the table came from human bulk-copy or
-- the initial seed. Mark them human-reviewed at NOW() so we don't trigger
-- a giant "needs review" badge on day one.
UPDATE public.translations
   SET translated_by = 'human',
       reviewed_at   = COALESCE(reviewed_at, NOW())
 WHERE translated_by = 'human' AND reviewed_at IS NULL;

-- Sanity check.
SELECT
  COUNT(*) FILTER (WHERE translated_by = 'human')    AS human_rows,
  COUNT(*) FILTER (WHERE translated_by = 'ai')       AS ai_rows,
  COUNT(*) FILTER (WHERE is_stale)                    AS stale_rows,
  COUNT(*) FILTER (WHERE source_hash IS NULL)         AS unhashed_rows
FROM public.translations;
