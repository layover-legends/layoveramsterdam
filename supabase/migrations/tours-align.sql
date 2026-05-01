-- =========================================================================
-- Tours alignment — adds the columns / indexes / RLS the admin code expects
-- without touching the existing `tours` rows or the legacy columns.
--
-- Context:
--   • `public.tours` already exists with 5 rows and these legacy columns:
--       type, duration_minutes, min_layover_hours, max_passengers,
--       min_passengers, is_active, is_adult_only
--   • `public.tour_stops` already exists (id, tour_id, destination_id,
--       stop_order, is_optional, duration_override, notes, created_at)
--   • The admin code (lib/admin/tours.ts) selects new columns:
--       duration_hours, price_cents, currency, max_group_size,
--       requires_booking, is_seasonal
--
-- This migration is idempotent: safe to re-run.
-- =========================================================================

-- 1) Add the missing columns to `tours` without dropping anything.
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS duration_hours   NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS price_cents      INT,
  ADD COLUMN IF NOT EXISTS currency         TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS max_group_size   INT,
  ADD COLUMN IF NOT EXISTS requires_booking BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_seasonal      BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Backfill the new columns from the legacy ones so existing rows are valid.
--    duration_hours = duration_minutes / 60   (when present)
--    max_group_size = max_passengers          (when present)
UPDATE public.tours
   SET duration_hours = ROUND((duration_minutes::NUMERIC) / 60.0, 1)
 WHERE duration_hours IS NULL
   AND duration_minutes IS NOT NULL;

UPDATE public.tours
   SET max_group_size = max_passengers
 WHERE max_group_size IS NULL
   AND max_passengers IS NOT NULL;

-- 3) Helpful indexes on the read path.
CREATE INDEX IF NOT EXISTS tours_slug_idx       ON public.tours (slug);
CREATE INDEX IF NOT EXISTS tours_is_active_idx  ON public.tours (is_active);
CREATE INDEX IF NOT EXISTS tour_stops_tour_idx  ON public.tour_stops (tour_id);
CREATE INDEX IF NOT EXISTS tour_stops_dest_idx  ON public.tour_stops (destination_id);

-- 4) updated_at trigger (only attaches if the helper exists).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_tours_updated_at ON public.tours;
    CREATE TRIGGER set_tours_updated_at
      BEFORE UPDATE ON public.tours
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 5) RLS — public reads active tours, admins manage all.
ALTER TABLE public.tours      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_stops ENABLE ROW LEVEL SECURITY;

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

-- 6) Sanity check — confirm columns exist + show row counts.
SELECT
  (SELECT COUNT(*) FROM public.tours)      AS tour_count,
  (SELECT COUNT(*) FROM public.tour_stops) AS tour_stop_count,
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'tours'
       AND column_name IN (
         'duration_hours','price_cents','currency',
         'max_group_size','requires_booking','is_seasonal'
       )) AS new_columns_present;  -- expect 6
