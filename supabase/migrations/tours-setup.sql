-- =========================================================================
-- Tours catalog — Phase 2 packaged tours and stop junctions.
-- Run once in Supabase SQL Editor. Idempotent: safe to re-run.
-- =========================================================================

-- 1) Core tours table.
CREATE TABLE IF NOT EXISTS public.tours (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  tagline          TEXT,
  description      TEXT,
  duration_hours   NUMERIC(4,1),
  price_cents      INT,
  currency         TEXT NOT NULL DEFAULT 'EUR',
  max_group_size   INT,
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  requires_booking BOOLEAN NOT NULL DEFAULT TRUE,
  is_adult_only    BOOLEAN NOT NULL DEFAULT FALSE,
  is_seasonal      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tours_slug_idx       ON public.tours (slug);
CREATE INDEX IF NOT EXISTS tours_is_active_idx  ON public.tours (is_active);

DROP TRIGGER IF EXISTS set_tours_updated_at ON public.tours;
CREATE TRIGGER set_tours_updated_at
  BEFORE UPDATE ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Junction table: which destinations appear on each tour, in what order.
CREATE TABLE IF NOT EXISTS public.tour_stops (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id        UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  stop_order     INT NOT NULL DEFAULT 0,
  UNIQUE (tour_id, destination_id)
);

CREATE INDEX IF NOT EXISTS tour_stops_tour_idx  ON public.tour_stops (tour_id);
CREATE INDEX IF NOT EXISTS tour_stops_dest_idx  ON public.tour_stops (destination_id);

-- 3) RLS — public reads active tours; admins manage all.
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'tours'
       AND policyname = 'Public reads active tours'
  ) THEN
    CREATE POLICY "Public reads active tours" ON public.tours
      FOR SELECT USING (is_active = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'tours'
       AND policyname = 'Admins manage tours'
  ) THEN
    CREATE POLICY "Admins manage tours" ON public.tours
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

ALTER TABLE public.tour_stops ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'tour_stops'
       AND policyname = 'Public reads tour_stops'
  ) THEN
    CREATE POLICY "Public reads tour_stops" ON public.tour_stops
      FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'tour_stops'
       AND policyname = 'Admins manage tour_stops'
  ) THEN
    CREATE POLICY "Admins manage tour_stops" ON public.tour_stops
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 4) Sanity check.
SELECT
  (SELECT COUNT(*) FROM public.tours)      AS tour_count,
  (SELECT COUNT(*) FROM public.tour_stops) AS tour_stop_count;
