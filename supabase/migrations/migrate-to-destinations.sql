-- =========================================================================
-- One-shot migration: move the 112 PDF stops out of public.free_stops
-- and into the proper public.destinations table that the rest of the
-- schema (tours, tour_stops, stop_photos, stop_opening_hours,
-- after_dark_stops, etc.) was designed around.
--
-- Run once in Supabase SQL Editor. Idempotent: every step uses IF NOT
-- EXISTS / ON CONFLICT so re-running is safe.
-- =========================================================================

-- 1) Slug helper: strips French accents and turns a name into a clean
-- url-safe slug. Used during the seed and reusable in future inserts.
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(
    regexp_replace(
      lower(translate(input,
        'àáâãäåèéêëìíîïòóôõöùúûüýÿñçœæ''',
        'aaaaaaeeeeiiiiooooouuuuyyncoa-')),
      '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'));
$$;

-- 2) Add the two categories the existing taxonomy is missing for our
-- catalogue: Architecture & Design and Spirituality & Religion.
INSERT INTO public.destination_categories (name, slug) VALUES
  ('Architecture & Design',     'architecture'),
  ('Spirituality & Religion',   'religion')
ON CONFLICT (slug) DO NOTHING;

-- 3) Bulk-copy our 112 free_stops into destinations with the right
-- category_id mapping. requires_booking = FALSE marks them as the free
-- catalogue. Slugs are unique across all destinations (we suffix with
-- the category slug so two stops named "Amstelkerk" can coexist in
-- different categories).
INSERT INTO public.destinations (
  category_id,
  name,
  slug,
  area,
  description,
  latitude,
  longitude,
  is_active,
  requires_booking,
  is_adult_only,
  is_seasonal,
  wheelchair_accessible
)
SELECT
  c.id                                                    AS category_id,
  fs.name                                                 AS name,
  public.slugify(fs.name) || '-' || c.slug                AS slug,
  fs.neighborhood                                         AS area,
  fs.description                                          AS description,
  fs.lat                                                  AS latitude,
  fs.lng                                                  AS longitude,
  COALESCE(fs.is_active, TRUE)                            AS is_active,
  FALSE                                                   AS requires_booking,
  FALSE                                                   AS is_adult_only,
  FALSE                                                   AS is_seasonal,
  FALSE                                                   AS wheelchair_accessible
FROM public.free_stops fs
JOIN public.destination_categories c
  ON c.slug = CASE fs.category::text
    WHEN 'monuments'     THEN 'monuments'
    WHEN 'canals'        THEN 'canals'
    WHEN 'neighborhoods' THEN 'quartiers'
    WHEN 'food'          THEN 'food'
    WHEN 'bars'          THEN 'bars'
    WHEN 'architecture'  THEN 'architecture'
    WHEN 'experiences'   THEN 'activities'
    WHEN 'hidden_gems'   THEN 'hidden'
    WHEN 'shopping'      THEN 'shopping'
    WHEN 'nature'        THEN 'nature'
    WHEN 'religion'      THEN 'religion'
  END
ON CONFLICT (slug) DO NOTHING;

-- 4) Carry over any image_urls that were set in free_stops as primary
-- photos in the proper stop_photos table.
INSERT INTO public.stop_photos (destination_id, url, alt_text, is_primary)
SELECT
  d.id,
  fs.image_url,
  fs.name,
  TRUE
FROM public.free_stops fs
JOIN public.destinations d
  ON d.name = fs.name
WHERE fs.image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.stop_photos p
     WHERE p.destination_id = d.id
       AND p.url = fs.image_url
  );

-- 5) Drop the orphan table and enum that we created by mistake.
DROP TABLE IF EXISTS public.free_stops CASCADE;
DROP TYPE  IF EXISTS public.free_stop_category CASCADE;

-- 6) RLS — enable on destinations, stop_photos, stop_opening_hours
-- and add admin-only write policies plus public read of active rows.
ALTER TABLE public.destinations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stop_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stop_opening_hours  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_categories ENABLE ROW LEVEL SECURITY;

-- Public read of active destinations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='destinations' AND policyname='Public reads active destinations') THEN
    CREATE POLICY "Public reads active destinations" ON public.destinations
      FOR SELECT USING (is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='destinations' AND policyname='Admins manage destinations') THEN
    CREATE POLICY "Admins manage destinations" ON public.destinations
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stop_photos' AND policyname='Public reads photos') THEN
    CREATE POLICY "Public reads photos" ON public.stop_photos
      FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stop_photos' AND policyname='Admins manage photos') THEN
    CREATE POLICY "Admins manage photos" ON public.stop_photos
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stop_opening_hours' AND policyname='Public reads opening hours') THEN
    CREATE POLICY "Public reads opening hours" ON public.stop_opening_hours
      FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stop_opening_hours' AND policyname='Admins manage opening hours') THEN
    CREATE POLICY "Admins manage opening hours" ON public.stop_opening_hours
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='destination_categories' AND policyname='Public reads categories') THEN
    CREATE POLICY "Public reads categories" ON public.destination_categories
      FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='destination_categories' AND policyname='Admins manage categories') THEN
    CREATE POLICY "Admins manage categories" ON public.destination_categories
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 7) Sanity check
SELECT
  (SELECT COUNT(*) FROM public.destinations WHERE requires_booking = FALSE) AS free_destinations,
  (SELECT COUNT(*) FROM public.destination_categories)                       AS categories,
  (SELECT COUNT(*) FROM public.stop_photos)                                  AS photos,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='free_stops') AS free_stops_still_exists;
