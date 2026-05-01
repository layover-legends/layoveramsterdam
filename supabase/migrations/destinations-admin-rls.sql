-- =========================================================================
-- Admin RLS bypass on public.destinations.
--
-- Without this, the only SELECT policy is "Destinations are public" with
-- (is_active = true) AND (is_adult_only = false), which hides the 65
-- adult-only rows from admins too. This file adds 4 admin policies
-- (SELECT/INSERT/UPDATE/DELETE) that key off public.is_admin(auth.uid()).
--
-- Public visitors keep the same view. Admins now see everything.
--
-- Idempotent: safe to re-run.
-- =========================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'destinations'
       AND policyname = 'Admins read destinations'
  ) THEN
    CREATE POLICY "Admins read destinations" ON public.destinations
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'destinations'
       AND policyname = 'Admins insert destinations'
  ) THEN
    CREATE POLICY "Admins insert destinations" ON public.destinations
      FOR INSERT
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'destinations'
       AND policyname = 'Admins update destinations'
  ) THEN
    CREATE POLICY "Admins update destinations" ON public.destinations
      FOR UPDATE
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'destinations'
       AND policyname = 'Admins delete destinations'
  ) THEN
    CREATE POLICY "Admins delete destinations" ON public.destinations
      FOR DELETE
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sanity check.
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'destinations'
 ORDER BY cmd, policyname;
