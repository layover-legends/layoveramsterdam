-- =========================================================================
-- Schema helpers — captures the two side-fixes we discovered while seeding.
-- Run once; idempotent and safe to re-run.
--
-- 1. public.slugify(text) — used by every seed file to build slugs.
-- 2. public.destinations.duration_minutes default — so admin inserts that
--    omit it don't fail the NOT NULL constraint.
-- 3. public.destination_categories — adds any categories the seeds rely on
--    that may not exist on a brand-new env (Architecture & Design,
--    Spirituality & Religion, Museums & Culture, Coffee Shops,
--    Red Light District, Nightlife).
-- =========================================================================

-- 1) Slugify helper -------------------------------------------------------
--    Lowercases, strips diacritics via unaccent, replaces non-alphanumeric
--    runs with a single hyphen, and trims leading/trailing hyphens.
--    Example: 'Café Papeneiland — Jordaan!' -> 'cafe-papeneiland-jordaan'

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(BOTH '-' FROM
           regexp_replace(
             lower(unaccent(coalesce(input, ''))),
             '[^a-z0-9]+', '-', 'g'
           )
         );
$$;

-- 2) duration_minutes default --------------------------------------------
--    The column is NOT NULL by design (every stop should have a guideline
--    duration). Without a default, the admin "create stop" form had to
--    supply it explicitly or the insert would fail. 60 minutes is a sane
--    average across museums, walking stops, and activities.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'destinations'
       AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.destinations
      ALTER COLUMN duration_minutes SET DEFAULT 60;
  END IF;
END $$;

-- 3) Categories the seeds rely on ----------------------------------------
--    These are added via the seed files too, but having them here means a
--    fresh env can run schema-helpers.sql first and the seeds in any order.

INSERT INTO public.destination_categories (name, slug) VALUES
  ('Architecture & Design',   'architecture'),
  ('Spirituality & Religion', 'religion'),
  ('Museums & Culture',       'museums'),
  ('Coffee Shops',            'coffee-shops'),
  ('Red Light District',      'red-light'),
  ('Nightlife',               'nightlife')
ON CONFLICT (slug) DO NOTHING;

-- 4) Sanity check --------------------------------------------------------
SELECT
  (SELECT public.slugify('Café Papeneiland — Jordaan!')) AS slugify_sample,
  (SELECT column_default
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'destinations'
      AND column_name = 'duration_minutes')              AS duration_default,
  (SELECT COUNT(*) FROM public.destination_categories
    WHERE slug IN (
      'architecture','religion','museums',
      'coffee-shops','red-light','nightlife'
    ))                                                    AS bonus_categories_present; -- expect 6
