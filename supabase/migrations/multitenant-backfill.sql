-- =========================================================================
-- Multitenant backfill — add city_id to every existing entity table.
--
-- Depends on: cities.sql (Amsterdam row must exist before this runs).
--
-- Adds city_id UUID → cities to:
--   destinations, tours, articles, translations, translation_glossary
--
-- Strategy per table:
--   1. ADD COLUMN … REFERENCES cities(id) (nullable first)
--   2. UPDATE SET city_id = amsterdam_id (backfill all existing rows)
--   3. SET NOT NULL (safe because step 2 filled every row)
--   4. ADD INDEX on city_id (or composite) to match query patterns
--   5. Update RLS policies to scope public reads to active cities
--      (REPLACE the existing public-read policy — logic unchanged,
--       city filter is additive safety for future multi-city use)
--
-- Idempotent: every step is guarded with IF NOT EXISTS / ON CONFLICT.
-- =========================================================================

DO $$
DECLARE
  amsterdam_id UUID;
BEGIN
  SELECT id INTO amsterdam_id FROM public.cities WHERE slug = 'amsterdam';
  IF amsterdam_id IS NULL THEN
    RAISE EXCEPTION 'Amsterdam city row not found. Run cities.sql first.';
  END IF;

  -- ── destinations ──────────────────────────────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'destinations'
       AND column_name = 'city_id'
  ) THEN
    ALTER TABLE public.destinations
      ADD COLUMN city_id UUID REFERENCES public.cities(id) ON DELETE RESTRICT;
  END IF;

  UPDATE public.destinations SET city_id = amsterdam_id WHERE city_id IS NULL;

  ALTER TABLE public.destinations ALTER COLUMN city_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_destinations_city_id
    ON public.destinations (city_id);

  -- Replace public read policy to include city scope.
  DROP POLICY IF EXISTS "Public reads active destinations" ON public.destinations;
  CREATE POLICY "Public reads active destinations" ON public.destinations
    FOR SELECT USING (
      is_active = TRUE
      AND city_id IN (SELECT id FROM public.cities WHERE is_active = TRUE)
    );

  -- ── tours ─────────────────────────────────────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'tours'
       AND column_name = 'city_id'
  ) THEN
    ALTER TABLE public.tours
      ADD COLUMN city_id UUID REFERENCES public.cities(id) ON DELETE RESTRICT;
  END IF;

  UPDATE public.tours SET city_id = amsterdam_id WHERE city_id IS NULL;

  ALTER TABLE public.tours ALTER COLUMN city_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_tours_city_id
    ON public.tours (city_id);

  -- Replace public read policy.
  DROP POLICY IF EXISTS "Public reads active tours" ON public.tours;
  CREATE POLICY "Public reads active tours" ON public.tours
    FOR SELECT USING (
      is_active = TRUE
      AND city_id IN (SELECT id FROM public.cities WHERE is_active = TRUE)
    );

  -- ── articles ──────────────────────────────────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'articles'
       AND column_name = 'city_id'
  ) THEN
    ALTER TABLE public.articles
      ADD COLUMN city_id UUID REFERENCES public.cities(id) ON DELETE RESTRICT;
  END IF;

  UPDATE public.articles SET city_id = amsterdam_id WHERE city_id IS NULL;

  ALTER TABLE public.articles ALTER COLUMN city_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_articles_city_id
    ON public.articles (city_id);

  -- ── translations ──────────────────────────────────────────────────────────
  -- translations uses entity_type + entity_id to point to any entity.
  -- We do NOT add city_id here — it would require denormalising the FK.
  -- City scoping for translations is achieved by joining through the entity
  -- table (destination.city_id, tour.city_id, etc.).

  -- ── translation_glossary ──────────────────────────────────────────────────
  -- Glossary entries are currently language-level (not city-scoped),
  -- which is correct: brand terms like "Schiphol" translate the same
  -- regardless of city. No city_id needed here.

END $$;

-- ── Sanity check ─────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.destinations WHERE city_id IS NULL)  AS dests_missing_city,
  (SELECT COUNT(*) FROM public.tours        WHERE city_id IS NULL)  AS tours_missing_city,
  (SELECT COUNT(*) FROM public.articles     WHERE city_id IS NULL)  AS articles_missing_city,
  (SELECT COUNT(*) FROM public.destinations)                         AS total_destinations,
  (SELECT COUNT(*) FROM public.tours)                                AS total_tours,
  (SELECT COUNT(*) FROM public.articles)                             AS total_articles;
-- Expect: all _missing_city = 0, totals match pre-migration counts
