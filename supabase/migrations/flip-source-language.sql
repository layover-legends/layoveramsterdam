-- =========================================================================
-- Phase 6 — flip the source language for destinations from FR to EN.
--
-- Why: the original seed wrote French into destinations.name/description/
-- area/tagline. Every other locale (NL/DE/ES/IT/PT) gets translated FROM
-- those FR strings — two-hop translation degrades quality, and English
-- (the lingua franca for layover travelers) is the worst-served because it
-- inherits French phrasing.
--
-- The fix: make English the source of truth. FR moves into translations[fr].
-- NL/DE/ES/IT/PT will be translated FROM EN by the bulk-translate script,
-- one hop only.
--
-- Pre-flight check (run this first to confirm we have full EN coverage):
--
--   SELECT
--     (SELECT COUNT(*) FROM destinations) AS total_dests,
--     (SELECT COUNT(*) FROM translations WHERE entity_type='destination'
--        AND field='name' AND language='en') AS en_names,
--     (SELECT COUNT(*) FROM translations WHERE entity_type='destination'
--        AND field='description' AND language='en') AS en_descriptions;
--
--   Expect: 219 / 219 / 219.  Do NOT proceed if any are short.
--
-- This migration is destructive in spirit (overwrites destinations source
-- columns) but reversible because the FR content is preserved in
-- translations[fr] before the swap. Wrapped in a transaction.
-- =========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Belt-and-braces: ensure FR rows exist in translations for every
--    destination's current source content. If FR coverage is already 100%
--    (it is, per our last check) this is a no-op upsert. If anything is
--    missing, this rescues it before we overwrite the source columns.
-- ---------------------------------------------------------------------------

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

INSERT INTO public.translations
  (entity_type, entity_id, field, language, value, translated_by, source_locale)
SELECT 'destination', id, 'tagline', 'fr', tagline, 'human', 'fr'
  FROM public.destinations
 WHERE tagline IS NOT NULL AND tagline <> ''
ON CONFLICT (entity_type, entity_id, field, language)
  DO UPDATE SET value = EXCLUDED.value
  WHERE public.translations.translated_by IS DISTINCT FROM 'human';

-- ---------------------------------------------------------------------------
-- 2) Promote EN translations into the source columns.
--    After this point, destinations.name (etc.) holds English content and
--    translations[fr] holds the original French. translations[en] becomes
--    redundant but we keep it for now — it's the audit trail of what was
--    promoted, and the read-path code still selects from translations
--    cleanly.
-- ---------------------------------------------------------------------------

UPDATE public.destinations d
   SET name = t.value
  FROM public.translations t
 WHERE t.entity_type = 'destination'
   AND t.entity_id   = d.id
   AND t.field       = 'name'
   AND t.language    = 'en'
   AND t.value IS NOT NULL
   AND t.value <> '';

UPDATE public.destinations d
   SET description = t.value
  FROM public.translations t
 WHERE t.entity_type = 'destination'
   AND t.entity_id   = d.id
   AND t.field       = 'description'
   AND t.language    = 'en'
   AND t.value IS NOT NULL
   AND t.value <> '';

UPDATE public.destinations d
   SET area = t.value
  FROM public.translations t
 WHERE t.entity_type = 'destination'
   AND t.entity_id   = d.id
   AND t.field       = 'area'
   AND t.language    = 'en'
   AND t.value IS NOT NULL
   AND t.value <> '';

UPDATE public.destinations d
   SET tagline = t.value
  FROM public.translations t
 WHERE t.entity_type = 'destination'
   AND t.entity_id   = d.id
   AND t.field       = 'tagline'
   AND t.language    = 'en'
   AND t.value IS NOT NULL
   AND t.value <> '';

-- ---------------------------------------------------------------------------
-- 3) Source-of-truth bookkeeping: stamp source_locale on every existing
--    translation so the bulk script and dashboard know what to compare
--    hashes against.
-- ---------------------------------------------------------------------------

UPDATE public.translations
   SET source_locale = 'en'
 WHERE entity_type IN ('destination', 'tour', 'article', 'tour_addon', 'ui')
   AND source_locale IS NULL;

-- ---------------------------------------------------------------------------
-- 4) Compute initial source_hash for every translation. The hash is taken
--    over the EN source string. This is the baseline for staleness detection.
-- ---------------------------------------------------------------------------

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
    -- ui strings and other types don't have a source column
    result := NULL;
  END IF;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

UPDATE public.translations
   SET source_hash = encode(digest(public.translation_source_text(entity_type, entity_id, field), 'sha256'), 'hex')
 WHERE source_hash IS NULL
   AND entity_type IN ('destination', 'tour', 'article')
   AND public.translation_source_text(entity_type, entity_id, field) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5) Verification — make sure we didn't lose anything.
-- ---------------------------------------------------------------------------

SELECT
  (SELECT COUNT(*) FROM public.destinations)
    AS dest_total,
  (SELECT COUNT(*) FROM public.destinations WHERE name ~ '[a-zA-Z]')
    AS dest_with_name,
  (SELECT COUNT(*) FROM public.translations
     WHERE entity_type='destination' AND field='name' AND language='fr')
    AS fr_names_preserved,
  (SELECT COUNT(*) FROM public.translations
     WHERE entity_type='destination' AND field='description' AND language='fr')
    AS fr_descriptions_preserved,
  (SELECT COUNT(*) FROM public.translations WHERE source_hash IS NOT NULL)
    AS hashed_translations;

-- Spot-check: pick a famous destination and confirm source is now EN.
-- Adjust slug if needed.
SELECT slug, name, area, LEFT(description, 80) AS desc_preview
  FROM public.destinations
 WHERE slug IN ('rijksmuseum', 'van-gogh-museum', 'anne-frank-house', 'vondelpark')
 ORDER BY slug;

COMMIT;
