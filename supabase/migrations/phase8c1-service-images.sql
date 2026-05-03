-- Phase 8c.1 — Service images: image_url on addons + tours, Storage bucket
-- Idempotent: safe to re-run. Run in Supabase SQL Editor.

BEGIN;

-- ── image_url columns ────────────────────────────────────────────────────────

ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.tours  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMIT;

-- ── Storage bucket ───────────────────────────────────────────────────────────
-- Create via Supabase Dashboard → Storage → New bucket: "service-images", Public ON
-- OR uncomment below (requires supabase_storage schema access):

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('service-images', 'service-images', TRUE)
-- ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Public read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'objects'
       AND schemaname = 'storage'
       AND policyname = 'service-images public read'
  ) THEN
    CREATE POLICY "service-images public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'service-images');
  END IF;
END $$;

-- Admin write
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'objects'
       AND schemaname = 'storage'
       AND policyname = 'service-images admin write'
  ) THEN
    CREATE POLICY "service-images admin write" ON storage.objects
      FOR ALL
      USING (bucket_id = 'service-images' AND public.is_admin(auth.uid()))
      WITH CHECK (bucket_id = 'service-images' AND public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sanity check
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'addons' AND column_name = 'image_url') AS addons_image_col,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'tours'  AND column_name = 'image_url') AS tours_image_col;
-- Expect: 1, 1
