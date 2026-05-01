-- =========================================================================
-- RLS policies for public.stop_photos.
--
-- Bug we hit: stop_photos had RLS enabled with ZERO policies, which is the
-- silent-block trap — every read returned empty, including embedded selects.
-- That broke:
--   • the homepage gallery (StopsTeaser)
--   • /admin/stops thumbnails
--   • /admin/seo dashboard's photo-issue detection
--
-- Fix: 1 public-read policy (photos are public assets — they belong on a
-- destination's public page) + 3 admin write policies.
--
-- Idempotent: safe to re-run.
-- =========================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='stop_photos'
       AND policyname='Public reads stop_photos'
  ) THEN
    CREATE POLICY "Public reads stop_photos" ON public.stop_photos
      FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='stop_photos'
       AND policyname='Admins insert stop_photos'
  ) THEN
    CREATE POLICY "Admins insert stop_photos" ON public.stop_photos
      FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='stop_photos'
       AND policyname='Admins update stop_photos'
  ) THEN
    CREATE POLICY "Admins update stop_photos" ON public.stop_photos
      FOR UPDATE USING (public.is_admin(auth.uid()))
                  WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='stop_photos'
       AND policyname='Admins delete stop_photos'
  ) THEN
    CREATE POLICY "Admins delete stop_photos" ON public.stop_photos
      FOR DELETE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sanity check.
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname='public' AND tablename='stop_photos'
 ORDER BY cmd, policyname;
