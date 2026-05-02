-- =========================================================================
-- translation_jobs — audit log for every autoTranslateEntity call.
--
-- Records outcome, per-locale breakdown, char usage, and errors so the
-- /admin/seo dashboard can surface "is auto-translate working?" without
-- guessing from Vercel logs.
--
-- trigger_source distinguishes the four calling surfaces:
--   'admin_save'   — on createStop/updateStop/createTour/updateTour
--   'admin_button' — the 🤖 Re-translate button on the SEO dashboard
--   'cli_bulk'     — scripts/bulk-translate.ts
--   'cron'         — future scheduled job
--
-- Idempotent: safe to re-run.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.translation_jobs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT        NOT NULL,
  entity_id      UUID        NOT NULL,
  triggered_by   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  triggered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_source TEXT        NOT NULL DEFAULT 'admin_save',
  written        INTEGER     NOT NULL DEFAULT 0,
  skipped        INTEGER     NOT NULL DEFAULT 0,
  errors         JSONB       NOT NULL DEFAULT '[]',
  per_locale     JSONB       NOT NULL DEFAULT '{}',
  duration_ms    INTEGER,
  deepl_chars    INTEGER     NOT NULL DEFAULT 0,
  CONSTRAINT translation_jobs_trigger_source_check
    CHECK (trigger_source IN ('admin_save', 'admin_button', 'cli_bulk', 'cron'))
);

-- Fast "last 20" query for the dashboard card.
CREATE INDEX IF NOT EXISTS idx_translation_jobs_triggered_at
  ON public.translation_jobs (triggered_at DESC);

-- Efficient entity history lookups.
CREATE INDEX IF NOT EXISTS idx_translation_jobs_entity
  ON public.translation_jobs (entity_type, entity_id);

-- RLS — admins only; public sees nothing.
ALTER TABLE public.translation_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'translation_jobs'
       AND policyname = 'Admins manage translation_jobs'
  ) THEN
    CREATE POLICY "Admins manage translation_jobs" ON public.translation_jobs
      FOR ALL
      USING  (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sanity check — expect cols=12, policies=1.
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'translation_jobs') AS cols,
  (SELECT COUNT(*) FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'translation_jobs')     AS policies;
