-- Phase 9d.5d: watermark metadata columns + default site_settings keys.
-- The variant filename rename (`:` → `x`) is a code-only change; no schema needed.
--
-- Apply via Supabase MCP before deploying the 9d.5d code changes.

-- ── 1. Watermark metadata on photos ──────────────────────────────────────────
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS watermarked        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS watermark_position TEXT
    CHECK (watermark_position IS NULL OR watermark_position IN
           ('northwest','north','northeast','east','southeast',
            'south','southwest','west','center')),
  ADD COLUMN IF NOT EXISTS watermark_opacity  INT
    CHECK (watermark_opacity IS NULL OR (watermark_opacity BETWEEN 1 AND 100));

-- ── 2. Default watermark policy in site_settings ──────────────────────────────
-- Sources where watermark is applied by default (comma-separated).
-- staff / vehicle / customer_upload / review / addon never get a brand watermark.
INSERT INTO public.site_settings (key, value) VALUES
  ('watermark_default_enabled',  'true'),
  ('watermark_default_position', 'southeast'),
  ('watermark_default_opacity',  '60'),
  ('watermark_sources_enabled',  'tour,destination,marketing,about')
ON CONFLICT (key) DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'photos'
   AND column_name IN ('watermarked','watermark_position','watermark_opacity')
 ORDER BY column_name;

SELECT key, value FROM public.site_settings
 WHERE key LIKE 'watermark%' ORDER BY key;
