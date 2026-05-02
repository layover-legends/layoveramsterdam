-- =========================================================================
-- Phase 6 — combined migration. Run as one paste in Supabase SQL Editor.
--
-- This file bundles three previously-separate migrations:
--   1) translations-staleness.sql   — adds source_hash/is_stale/translated_by/etc.
--   2) translation-glossary.sql     — creates glossary table + seeds 48 entries
--   3) flip-source-language.sql     — promotes EN to source columns,
--                                     preserves FR in translations[fr]
--
-- Built-in pre-flight: aborts via RAISE EXCEPTION if EN coverage isn't 219/219
-- before the source flip runs. Steps 1 and 2 always run; step 3 is gated.
--
-- Idempotent end-to-end. Safe to re-run.
-- =========================================================================

-- -------------------------------------------------------------------------
-- PART 1 — Staleness tracking columns on translations
-- -------------------------------------------------------------------------

ALTER TABLE public.translations
  ADD COLUMN IF NOT EXISTS source_hash    TEXT,
  ADD COLUMN IF NOT EXISTS is_stale       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS translated_by  TEXT NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_locale  TEXT;

ALTER TABLE public.translations
  DROP CONSTRAINT IF EXISTS translations_translated_by_check,
  ADD CONSTRAINT translations_translated_by_check
    CHECK (translated_by IN ('human', 'ai', 'imported'));

CREATE INDEX IF NOT EXISTS idx_translations_stale
  ON public.translations (is_stale) WHERE is_stale = TRUE;

CREATE INDEX IF NOT EXISTS idx_translations_by_source
  ON public.translations (translated_by);

-- Backfill: existing rows are human-curated.
UPDATE public.translations
   SET translated_by = 'human',
       reviewed_at   = COALESCE(reviewed_at, NOW())
 WHERE translated_by = 'human' AND reviewed_at IS NULL;

-- -------------------------------------------------------------------------
-- PART 2 — Translation glossary table + seed
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.translation_glossary (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_term  TEXT NOT NULL,
  source_lang  TEXT NOT NULL DEFAULT 'en',
  target_lang  TEXT NOT NULL,
  target_term  TEXT NOT NULL,
  do_not_translate BOOLEAN NOT NULL DEFAULT FALSE,
  case_sensitive   BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_term, source_lang, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_glossary_source
  ON public.translation_glossary (source_lang, source_term);
CREATE INDEX IF NOT EXISTS idx_glossary_target
  ON public.translation_glossary (target_lang);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_glossary_updated_at ON public.translation_glossary;
    CREATE TRIGGER set_glossary_updated_at
      BEFORE UPDATE ON public.translation_glossary
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.translation_glossary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='translation_glossary'
       AND policyname='Public reads glossary') THEN
    CREATE POLICY "Public reads glossary" ON public.translation_glossary
      FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='translation_glossary'
       AND policyname='Admins manage glossary') THEN
    CREATE POLICY "Admins manage glossary" ON public.translation_glossary
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Brand and place names — never translate.
INSERT INTO public.translation_glossary
  (source_term, source_lang, target_lang, target_term, do_not_translate, notes)
VALUES
  ('LayoverAmsterdam', 'en', 'fr', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam', 'en', 'nl', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam', 'en', 'de', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam', 'en', 'es', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam', 'en', 'it', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam', 'en', 'pt', 'LayoverAmsterdam', TRUE, 'brand'),
  ('Schiphol', 'en', 'fr', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol', 'en', 'nl', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol', 'en', 'de', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol', 'en', 'es', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol', 'en', 'it', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol', 'en', 'pt', 'Schiphol', TRUE, 'airport name'),
  ('Vondelpark', 'en', 'fr', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark', 'en', 'nl', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark', 'en', 'de', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark', 'en', 'es', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark', 'en', 'it', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark', 'en', 'pt', 'Vondelpark', TRUE, 'place name'),
  ('Jordaan', 'en', 'fr', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan', 'en', 'nl', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan', 'en', 'de', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan', 'en', 'es', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan', 'en', 'it', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan', 'en', 'pt', 'Jordaan', TRUE, 'neighborhood'),
  ('De Wallen', 'en', 'fr', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen', 'en', 'nl', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen', 'en', 'de', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen', 'en', 'es', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen', 'en', 'it', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen', 'en', 'pt', 'De Wallen', TRUE, 'neighborhood')
ON CONFLICT (source_term, source_lang, target_lang) DO NOTHING;

-- Cultural terms — translated semantically, not literally.
INSERT INTO public.translation_glossary
  (source_term, source_lang, target_lang, target_term, do_not_translate, notes)
VALUES
  ('coffeeshop', 'en', 'fr', 'coffeeshop',  FALSE, 'NL term for cannabis cafe; keep verbatim'),
  ('coffeeshop', 'en', 'nl', 'coffeeshop',  FALSE, 'native term'),
  ('coffeeshop', 'en', 'de', 'Coffeeshop',  FALSE, 'German loanword, capitalised'),
  ('coffeeshop', 'en', 'es', 'coffeeshop',  FALSE, 'no Spanish equivalent; keep verbatim'),
  ('coffeeshop', 'en', 'it', 'coffeeshop',  FALSE, 'no Italian equivalent; keep verbatim'),
  ('coffeeshop', 'en', 'pt', 'coffeeshop',  FALSE, 'no Portuguese equivalent; keep verbatim'),
  ('Red Light District', 'en', 'fr', 'Quartier Rouge',         FALSE, NULL),
  ('Red Light District', 'en', 'nl', 'Rosse Buurt',            FALSE, NULL),
  ('Red Light District', 'en', 'de', 'Rotlichtviertel',        FALSE, NULL),
  ('Red Light District', 'en', 'es', 'Barrio Rojo',            FALSE, NULL),
  ('Red Light District', 'en', 'it', 'Quartiere a Luci Rosse', FALSE, NULL),
  ('Red Light District', 'en', 'pt', 'Bairro da Luz Vermelha', FALSE, NULL),
  ('layover', 'en', 'fr', 'escale',         FALSE, NULL),
  ('layover', 'en', 'nl', 'overstap',       FALSE, NULL),
  ('layover', 'en', 'de', 'Zwischenstopp',  FALSE, NULL),
  ('layover', 'en', 'es', 'escala',         FALSE, NULL),
  ('layover', 'en', 'it', 'scalo',          FALSE, NULL),
  ('layover', 'en', 'pt', 'escala',         FALSE, NULL)
ON CONFLICT (source_term, source_lang, target_lang) DO NOTHING;

-- -------------------------------------------------------------------------
-- PART 3 — Pre-flight gate for the source-language flip
--
-- Aborts the entire batch if EN destination coverage is not 219/219.
-- This prevents the flip from clobbering FR source columns when EN isn't
-- ready, which would lose content. Safe — DDL above already committed.
-- -------------------------------------------------------------------------

DO $$
DECLARE
  v_total_dests   INT;
  v_en_names      INT;
  v_en_descs      INT;
BEGIN
  SELECT COUNT(*) INTO v_total_dests FROM public.destinations;
  SELECT COUNT(*) INTO v_en_names    FROM public.translations
    WHERE entity_type='destination' AND field='name'        AND language='en';
  SELECT COUNT(*) INTO v_en_descs    FROM public.translations
    WHERE entity_type='destination' AND field='description' AND language='en';

  RAISE NOTICE 'Pre-flight: % destinations · EN names: % · EN descriptions: %',
    v_total_dests, v_en_names, v_en_descs;

  IF v_total_dests = 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: 0 destinations in table';
  END IF;

  IF v_en_names < v_total_dests OR v_en_descs < v_total_dests THEN
    RAISE EXCEPTION 'Pre-flight failed: EN coverage is %/% names · %/% descriptions. Source flip aborted to prevent content loss. (Parts 1 and 2 of this migration are already committed.)',
      v_en_names, v_total_dests, v_en_descs, v_total_dests;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- PART 4 — Source language flip (only runs if pre-flight passed)
-- -------------------------------------------------------------------------

BEGIN;

-- 4a) Belt-and-braces: ensure FR rows exist in translations for every
--     destination's current source content.
INSERT INTO public.translations
  (entity_type, entity_id, field, language, value, translated_by, source_locale)
SELECT 'destination', id, 'name', 'fr', name, 'human', 'fr'
  FROM public.destinations
 WHERE name IS NOT NULL AND name <> ''
ON CONFLICT (entity_type, entity_id, field, language)
  DO UPDATE SET value = EXCLUDED.value
  WHERE public.translations.translated_by IS DISTINCT FROM 'human';

INSERT INTO public.translations
  (entity_type, entity_id, field, language, value, translated_by, source_locale)
SELECT 'destination', id, 'description', 'fr', description, 'human', 'fr'
  FROM public.destinations
 WHERE description IS NOT NULL AND description <> ''
ON CONFLICT (entity_type, entity_id, field, language)
  DO UPDATE SET value = EXCLUDED.value
  WHERE public.translations.translated_by IS DISTINCT FROM 'human';

INSERT INTO public.translations
  (entity_type, entity_id, field, language, value, translated_by, source_locale)
SELECT 'destination', id, 'area', 'fr', area, 'human', 'fr'
  FROM public.destinations
 WHERE area IS NOT NULL AND area <> ''
ON CONFLICT (entity_type, entity_id, field, language)
  DO UPDATE SET value = EXCLUDED.value
  WHERE public.translations.translated_by IS DISTINCT FROM 'human';

-- (destinations.tagline does not exist — only tours have a tagline. Skipped.)

-- 4b) Promote EN translations into the source columns.
UPDATE public.destinations d
   SET name = t.value
  FROM public.translations t
 WHERE t.entity_type='destination' AND t.entity_id=d.id
   AND t.field='name' AND t.language='en'
   AND t.value IS NOT NULL AND t.value <> '';

UPDATE public.destinations d
   SET description = t.value
  FROM public.translations t
 WHERE t.entity_type='destination' AND t.entity_id=d.id
   AND t.field='description' AND t.language='en'
   AND t.value IS NOT NULL AND t.value <> '';

UPDATE public.destinations d
   SET area = t.value
  FROM public.translations t
 WHERE t.entity_type='destination' AND t.entity_id=d.id
   AND t.field='area' AND t.language='en'
   AND t.value IS NOT NULL AND t.value <> '';

-- (destinations.tagline does not exist — only tours have a tagline. Skipped.)

-- 4c) Stamp source_locale on every translation row.
UPDATE public.translations
   SET source_locale = 'en'
 WHERE entity_type IN ('destination','tour','article','tour_addon','ui')
   AND source_locale IS NULL;

-- 4d) Compute initial source_hash for staleness tracking.
CREATE OR REPLACE FUNCTION public.translation_source_text(
  _entity_type TEXT, _entity_id UUID, _field TEXT
) RETURNS TEXT
LANGUAGE plpgsql STABLE AS $$
DECLARE result TEXT;
BEGIN
  IF _entity_type = 'destination' THEN
    EXECUTE format('SELECT %I FROM public.destinations WHERE id = $1', _field)
       INTO result USING _entity_id;
  ELSIF _entity_type = 'tour' THEN
    EXECUTE format('SELECT %I FROM public.tours WHERE id = $1', _field)
       INTO result USING _entity_id;
  ELSIF _entity_type = 'article' THEN
    EXECUTE format('SELECT %I FROM public.articles WHERE id = $1', _field)
       INTO result USING _entity_id;
  ELSE
    result := NULL;
  END IF;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

UPDATE public.translations
   SET source_hash = encode(digest(
     public.translation_source_text(entity_type, entity_id, field),
     'sha256'), 'hex')
 WHERE source_hash IS NULL
   AND entity_type IN ('destination','tour','article')
   AND public.translation_source_text(entity_type, entity_id, field) IS NOT NULL;

COMMIT;

-- -------------------------------------------------------------------------
-- Final verification — paste these results back to confirm success
-- -------------------------------------------------------------------------

SELECT 'phase6 complete' AS status,
  (SELECT COUNT(*) FROM public.translation_glossary)             AS glossary_rows,
  (SELECT COUNT(*) FROM public.translations
     WHERE source_hash IS NOT NULL)                              AS hashed_rows,
  (SELECT COUNT(*) FROM public.translations
     WHERE entity_type='destination' AND language='fr' AND field='name') AS fr_names_preserved,
  (SELECT COUNT(*) FROM public.destinations WHERE name ~ '^[A-Z]') AS en_source_dests;

-- Spot-check a few famous slugs to confirm the flip worked.
-- (Adjust slugs if you renamed any of these.)
SELECT slug, name, area, LEFT(description, 80) AS desc_preview
  FROM public.destinations
 WHERE slug IN ('rijksmuseum', 'van-gogh-museum', 'anne-frank-house', 'vondelpark')
 ORDER BY slug;
