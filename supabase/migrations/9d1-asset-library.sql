-- Phase 9d.1 — Smart-crop pipeline + Asset Library (DAM)
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- Extends Phase 9d photos table with everything a real DAM needs.

-- ── 1. photos — augment with DAM-grade metadata ──────────────────────────────

ALTER TABLE public.photos
  -- Original file info (traceability + downloads)
  ADD COLUMN IF NOT EXISTS original_filename     TEXT,
  ADD COLUMN IF NOT EXISTS mime_type             TEXT,
  -- Smart cropping: focal point as 0.0–1.0 percentages
  ADD COLUMN IF NOT EXISTS focal_point_x         NUMERIC(5,4) DEFAULT 0.5
    CHECK (focal_point_x IS NULL OR (focal_point_x >= 0 AND focal_point_x <= 1)),
  ADD COLUMN IF NOT EXISTS focal_point_y         NUMERIC(5,4) DEFAULT 0.5
    CHECK (focal_point_y IS NULL OR (focal_point_y >= 0 AND focal_point_y <= 1)),
  ADD COLUMN IF NOT EXISTS crop_strategy         TEXT NOT NULL DEFAULT 'attention'
    CHECK (crop_strategy IN ('center','attention','entropy','manual_focal')),
  -- Variants generated (e.g. {'1:1','4:3','16:9','21:9','9:16'})
  ADD COLUMN IF NOT EXISTS aspect_ratios_generated TEXT[] DEFAULT '{}',
  -- Visual placeholder while loading (blurhash string, ~28 chars)
  ADD COLUMN IF NOT EXISTS blurhash              TEXT,
  -- Dominant color hex for theme matching (e.g. '#3a5f8a')
  ADD COLUMN IF NOT EXISTS dominant_color        TEXT
    CHECK (dominant_color IS NULL OR dominant_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Tagging for DAM search/filter (free-form)
  ADD COLUMN IF NOT EXISTS tags                  TEXT[] NOT NULL DEFAULT '{}',
  -- Copyright + licensing (legal protection at scale)
  ADD COLUMN IF NOT EXISTS copyright_holder      TEXT,
  ADD COLUMN IF NOT EXISTS license_type          TEXT
    CHECK (license_type IS NULL OR license_type IN (
      'owned','royalty_free','rights_managed','creative_commons','editorial_only',
      'press_kit','customer_upload','unsplash','pexels','unknown'
    )),
  ADD COLUMN IF NOT EXISTS license_expires_at    DATE,
  ADD COLUMN IF NOT EXISTS photographer_credit   TEXT,
  ADD COLUMN IF NOT EXISTS license_notes         TEXT,
  -- Moderation (especially for review photos)
  ADD COLUMN IF NOT EXISTS nsfw_flag             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS moderation_status     TEXT NOT NULL DEFAULT 'auto_approved'
    CHECK (moderation_status IN ('auto_approved','pending_review','approved','rejected','quarantined')),
  ADD COLUMN IF NOT EXISTS moderation_notes      TEXT,
  -- AI-suggested alt text (admin can accept or override)
  ADD COLUMN IF NOT EXISTS ai_alt_text_suggested TEXT,
  -- Quick lookup for orphan detection
  ADD COLUMN IF NOT EXISTS usage_count           INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at          TIMESTAMPTZ,
  -- Timestamps
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for DAM queries
CREATE INDEX IF NOT EXISTS idx_photos_tags         ON public.photos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_photos_license      ON public.photos(license_type) WHERE license_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_orphans      ON public.photos(usage_count) WHERE usage_count = 0;
CREATE INDEX IF NOT EXISTS idx_photos_moderation   ON public.photos(moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_license_expiry ON public.photos(license_expires_at) WHERE license_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_alt_text_search ON public.photos USING GIN (to_tsvector('simple', alt_text));

-- ── 2. photo_usage — junction table for "where is this photo used?" ──────────
-- A single photo can be used in many places (tour hero, destination gallery,
-- about page, social meta image). This table is the source of truth for cross-refs.
-- Maintained by application-level inserts/deletes when photos are linked/unlinked.

CREATE TABLE IF NOT EXISTS public.photo_usage (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      UUID        NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  entity_type   TEXT        NOT NULL CHECK (entity_type IN (
    'tour','destination','staff','vehicle','review','testimonial',
    'about_section','hero_slot','social_share','meta_image','article','category'
  )),
  entity_id     UUID,
  field_name    TEXT,        -- e.g. 'hero_image', 'gallery[3]', 'avatar', 'og_image'
  context       TEXT,        -- additional human-readable context: 'Homepage hero', 'Footer logo'
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (photo_id, entity_type, entity_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_photo_usage_photo     ON public.photo_usage(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_usage_entity    ON public.photo_usage(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_photo_usage_field     ON public.photo_usage(field_name);

ALTER TABLE public.photo_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='photo_usage' AND policyname='photo_usage_admin_all') THEN
    CREATE POLICY photo_usage_admin_all ON public.photo_usage
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  -- Public can read so the website can show "this photo by X is used in Y tour"
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='photo_usage' AND policyname='photo_usage_public_read') THEN
    CREATE POLICY photo_usage_public_read ON public.photo_usage
      FOR SELECT USING (TRUE);
  END IF;
END $$;

-- ── 3. Trigger to keep photos.usage_count + last_used_at fresh ───────────────
CREATE OR REPLACE FUNCTION public.update_photo_usage_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_photo UUID := COALESCE(NEW.photo_id, OLD.photo_id);
BEGIN
  IF v_photo IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.photos p SET
    usage_count  = (SELECT COUNT(*) FROM public.photo_usage WHERE photo_id = v_photo),
    last_used_at = (SELECT MAX(created_at) FROM public.photo_usage WHERE photo_id = v_photo)
  WHERE p.id = v_photo;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_photo_usage_count ON public.photo_usage;
CREATE TRIGGER trg_photo_usage_count
  AFTER INSERT OR DELETE ON public.photo_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_photo_usage_count();

-- ── 4. updated_at trigger on photos (keeps timestamp fresh on edits) ─────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_photos_touch_updated ON public.photos;
CREATE TRIGGER trg_photos_touch_updated
  BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 5. View for orphaned photos (admin dashboard quick query) ────────────────
CREATE OR REPLACE VIEW public.v_orphaned_photos AS
  SELECT p.id, p.storage_path, p.alt_text, p.bytes, p.created_at
  FROM public.photos p
  WHERE p.usage_count = 0
    AND p.is_public = TRUE
  ORDER BY p.created_at DESC;

GRANT SELECT ON public.v_orphaned_photos TO authenticated;

-- ── 6. View for asset library summary metrics ────────────────────────────────
CREATE OR REPLACE VIEW public.v_asset_library_summary AS
  SELECT
    COUNT(*) FILTER (WHERE is_public = TRUE)                AS total_photos,
    COUNT(*) FILTER (WHERE usage_count = 0)                 AS orphaned_count,
    COUNT(*) FILTER (WHERE moderation_status = 'pending_review') AS pending_moderation,
    COUNT(*) FILTER (WHERE license_expires_at < CURRENT_DATE + INTERVAL '30 days')
                                                            AS license_expiring_soon,
    COUNT(*) FILTER (WHERE nsfw_flag = TRUE)                AS nsfw_flagged,
    COALESCE(SUM(bytes) FILTER (WHERE is_public = TRUE), 0) AS total_bytes,
    COUNT(DISTINCT uploaded_by)                             AS unique_uploaders
  FROM public.photos;

GRANT SELECT ON public.v_asset_library_summary TO authenticated;

-- ── 7. Sanity check ──────────────────────────────────────────────────────────
SELECT 'photos new columns' AS check_name, COUNT(*) AS column_count
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='photos'
    AND column_name IN ('focal_point_x','focal_point_y','crop_strategy','blurhash',
                        'dominant_color','tags','license_type','usage_count');
SELECT 'photo_usage' AS tbl, COUNT(*) FROM public.photo_usage;
SELECT 'v_orphaned_photos' AS view_name, COUNT(*) FROM public.v_orphaned_photos;
SELECT * FROM public.v_asset_library_summary;
