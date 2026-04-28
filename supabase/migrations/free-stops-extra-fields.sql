-- =========================================================================
-- Add richer admin-editable fields to public.free_stops.
-- Run once in Supabase SQL Editor. Idempotent: safe to re-run.
-- =========================================================================

ALTER TABLE public.free_stops
  ADD COLUMN IF NOT EXISTS image_url                 TEXT,
  ADD COLUMN IF NOT EXISTS external_url              TEXT,
  ADD COLUMN IF NOT EXISTS tips                      TEXT,
  ADD COLUMN IF NOT EXISTS suggested_duration_minutes INT;

-- =========================================================================
-- Storage bucket policies for admin image uploads
-- The 'assets' bucket is already public-read (used by the homepage hero).
-- We need admin-only INSERT/UPDATE/DELETE policies for the stops/ prefix.
-- =========================================================================

DO $$
BEGIN
  -- Make sure the bucket exists and is public.
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('assets', 'assets', TRUE)
  ON CONFLICT (id) DO UPDATE SET public = TRUE;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Could not modify storage.buckets — run the next policies via the Storage UI if RLS blocks them.';
END $$;

-- Admins can INSERT into assets/stops/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects'
       AND policyname='Admins upload stop images'
  ) THEN
    CREATE POLICY "Admins upload stop images" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'stops'
        AND public.is_admin(auth.uid())
      );
  END IF;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- Admins can UPDATE/DELETE in assets/stops/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects'
       AND policyname='Admins update stop images'
  ) THEN
    CREATE POLICY "Admins update stop images" ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'stops'
        AND public.is_admin(auth.uid())
      )
      WITH CHECK (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'stops'
        AND public.is_admin(auth.uid())
      );
  END IF;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects'
       AND policyname='Admins delete stop images'
  ) THEN
    CREATE POLICY "Admins delete stop images" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'stops'
        AND public.is_admin(auth.uid())
      );
  END IF;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
