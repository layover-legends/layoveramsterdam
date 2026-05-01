-- =========================================================================
-- Phase 6 prep — translation glossary.
--
-- DeepL Pro has a glossary feature; DeepL Free does not. Either way, we keep
-- our own server-side glossary so:
--
--   1. Brand and place terms ("LayoverAmsterdam", "Schiphol", "Vondelpark",
--      "De Wallen") are NEVER translated.
--   2. Cultural-loaded terms ("coffeeshop", "Red Light District") map to the
--      right phrase per locale instead of being literally translated.
--   3. We can switch translation providers later without losing our term
--      knowledge — the glossary lives in our database, not theirs.
--
-- The glossary is applied as pre/post-processing around DeepL calls:
--   - PRE: replace each glossary source_term with a placeholder token
--          (e.g. "{{G_42}}") so DeepL can't touch it.
--   - POST: replace each placeholder with the locale-specific target_term.
--
-- Idempotent: safe to re-run.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.translation_glossary (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_term  TEXT NOT NULL,
  source_lang  TEXT NOT NULL DEFAULT 'en',
  target_lang  TEXT NOT NULL,
  target_term  TEXT NOT NULL,
  -- if true, target_term is ignored and the source_term is preserved verbatim
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

-- updated_at trigger
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

-- RLS — public reads (so client renderers can apply glossary if needed),
-- admins manage.
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

-- =========================================================================
-- Seed the must-have entries. These are the terms most likely to embarrass
-- the brand if DeepL gets them wrong. Add more via /admin/glossary later.
-- =========================================================================

-- Brand and place names — never translate, all locales.
INSERT INTO public.translation_glossary
  (source_term, source_lang, target_lang, target_term, do_not_translate, notes)
VALUES
  ('LayoverAmsterdam',  'en', 'fr', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam',  'en', 'nl', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam',  'en', 'de', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam',  'en', 'es', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam',  'en', 'it', 'LayoverAmsterdam', TRUE, 'brand'),
  ('LayoverAmsterdam',  'en', 'pt', 'LayoverAmsterdam', TRUE, 'brand'),
  ('Schiphol',          'en', 'fr', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol',          'en', 'nl', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol',          'en', 'de', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol',          'en', 'es', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol',          'en', 'it', 'Schiphol', TRUE, 'airport name'),
  ('Schiphol',          'en', 'pt', 'Schiphol', TRUE, 'airport name'),
  ('Vondelpark',        'en', 'fr', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark',        'en', 'nl', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark',        'en', 'de', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark',        'en', 'es', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark',        'en', 'it', 'Vondelpark', TRUE, 'place name'),
  ('Vondelpark',        'en', 'pt', 'Vondelpark', TRUE, 'place name'),
  ('Jordaan',           'en', 'fr', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan',           'en', 'nl', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan',           'en', 'de', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan',           'en', 'es', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan',           'en', 'it', 'Jordaan', TRUE, 'neighborhood'),
  ('Jordaan',           'en', 'pt', 'Jordaan', TRUE, 'neighborhood'),
  ('De Wallen',         'en', 'fr', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen',         'en', 'nl', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen',         'en', 'de', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen',         'en', 'es', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen',         'en', 'it', 'De Wallen', TRUE, 'neighborhood'),
  ('De Wallen',         'en', 'pt', 'De Wallen', TRUE, 'neighborhood')
ON CONFLICT (source_term, source_lang, target_lang) DO NOTHING;

-- Cultural terms — translated semantically, not literally.
-- "coffeeshop" in Amsterdam = cannabis cafe, not a place that sells coffee.
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
  ('layover', 'en', 'fr', 'escale',     FALSE, NULL),
  ('layover', 'en', 'nl', 'overstap',   FALSE, NULL),
  ('layover', 'en', 'de', 'Zwischenstopp', FALSE, NULL),
  ('layover', 'en', 'es', 'escala',     FALSE, NULL),
  ('layover', 'en', 'it', 'scalo',      FALSE, NULL),
  ('layover', 'en', 'pt', 'escala',     FALSE, NULL)
ON CONFLICT (source_term, source_lang, target_lang) DO NOTHING;

-- Sanity check.
SELECT
  COUNT(*)                                            AS glossary_total,
  COUNT(*) FILTER (WHERE do_not_translate)            AS preserve_terms,
  COUNT(DISTINCT source_term)                         AS unique_terms,
  COUNT(DISTINCT target_lang)                         AS languages_covered
FROM public.translation_glossary;
