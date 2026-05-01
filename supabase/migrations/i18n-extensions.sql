-- =========================================================================
-- Phase 5 i18n schema prep.
--
-- Adds the unique constraint that lets us upsert translations cleanly,
-- plus read-path indexes for the lookup pattern, plus admin RLS bypass.
--
-- Idempotent: safe to re-run.
-- =========================================================================

ALTER TABLE public.translations
  DROP CONSTRAINT IF EXISTS translations_unique_key,
  ADD CONSTRAINT translations_unique_key
    UNIQUE (entity_type, entity_id, field, language);

CREATE INDEX IF NOT EXISTS idx_translations_lookup
  ON public.translations (entity_type, entity_id, language);

-- For UI strings (no entity_id), partial index on (field, language).
CREATE INDEX IF NOT EXISTS idx_translations_ui_field
  ON public.translations (field, language)
  WHERE entity_type = 'ui';

-- RLS — admin manage + public read.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='translations'
       AND policyname='Public reads translations'
  ) THEN
    CREATE POLICY "Public reads translations" ON public.translations
      FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='translations'
       AND policyname='Admins manage translations'
  ) THEN
    CREATE POLICY "Admins manage translations" ON public.translations
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sanity check.
SELECT
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename='translations') AS policies_count,
  (SELECT COUNT(*) FROM pg_indexes  WHERE schemaname='public' AND tablename='translations') AS index_count,
  (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE table_schema='public' AND table_name='translations' AND constraint_type='UNIQUE') AS unique_count,
  (SELECT COUNT(*) FROM public.translations) AS total_translations;
