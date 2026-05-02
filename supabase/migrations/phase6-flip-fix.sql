-- =========================================================================
-- Phase 6 — source-language flip, FIXED.
--
-- The previous combined migration assumed destinations.tagline existed.
-- It doesn't (tagline is on tours only). This file does just the flip,
-- restricted to the columns that actually exist on each table.
--
-- Safe to re-run. Idempotent.
-- =========================================================================

-- Pre-flight gate (same as before — aborts if EN coverage isn't 219/219)
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
    RAISE EXCEPTION 'Pre-flight failed: EN coverage is %/% names · %/% descriptions. Source flip aborted.',
      v_en_names, v_total_dests, v_en_descs, v_total_dests;
  END IF;
END $$;

BEGIN;

-- 1) Preserve current FR source values into translations[fr] (idempotent;
--    never clobbers human-curated rows).
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

-- 2) Promote EN translations into the source columns.
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

-- 3) Stamp source_locale on every translation row so the bulk script and
--    dashboard know what to compare against.
UPDATE public.translations
   SET source_locale = 'en'
 WHERE entity_type IN ('destination','tour','article','tour_addon','ui')
   AND source_locale IS NULL;

-- 4) Source-hash helper + initial backfill for staleness tracking.
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

-- =========================================================================
-- Verification — paste these results back to confirm success.
-- =========================================================================

SELECT 'phase6 flip complete' AS status,
  (SELECT COUNT(*) FROM public.translation_glossary)             AS glossary_rows,
  (SELECT COUNT(*) FROM public.translations
     WHERE source_hash IS NOT NULL)                              AS hashed_rows,
  (SELECT COUNT(*) FROM public.translations
     WHERE entity_type='destination' AND language='fr' AND field='name') AS fr_names_preserved,
  (SELECT COUNT(*) FROM public.destinations WHERE name ~ '^[A-Z]') AS en_source_dests;

-- Spot-check a few famous slugs.
SELECT slug, name, area, LEFT(description, 80) AS desc_preview
  FROM public.destinations
 WHERE slug IN ('rijksmuseum', 'van-gogh-museum', 'anne-frank-house', 'vondelpark')
 ORDER BY slug;
