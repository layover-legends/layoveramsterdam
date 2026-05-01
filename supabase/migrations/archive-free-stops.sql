-- =========================================================================
-- Archive the legacy public.free_stops table.
--
-- All 112 rows were migrated into public.destinations on 2026-04-27 via
-- migrate-to-destinations.sql. Every admin and public read path now queries
-- destinations. The free_stops table is dead weight, but renaming (instead
-- of dropping) keeps the data around in case anyone needs to refer back
-- and makes the deprecation obvious in the schema browser.
--
-- Rename, don't drop. Reversible if we discover something missing.
-- Idempotent: only acts if the table still exists under its old name.
-- =========================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'free_stops'
  ) THEN
    ALTER TABLE public.free_stops
      RENAME TO _archive_free_stops_2026_05_01;
  END IF;
END $$;

-- Confirm.
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND (table_name = 'free_stops'
     OR table_name = '_archive_free_stops_2026_05_01');
