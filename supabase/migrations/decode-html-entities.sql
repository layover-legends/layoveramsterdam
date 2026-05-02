-- =========================================================================
-- One-shot fix-up: decode HTML entities in existing AI translations.
--
-- Why: DeepL with tag_handling="html" emits apostrophes/quotes as HTML
-- entities (e.g. &#x27; for '). Our deepl.ts postprocess now decodes these
-- on new translations, but rows already in the table from past runs still
-- contain the encoded form. This UPDATE decodes them in place.
--
-- Order matters: &amp; LAST so we don't double-decode &amp;#x27; → &#x27; → '.
-- Idempotent — re-running on already-decoded rows is a no-op.
--
-- Touches every translation row regardless of language or entity_type. Safe
-- because the decode is purely a textual substitution.
-- =========================================================================

UPDATE public.translations
SET value = REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(value, '&#x27;', ''''),
                      '&#39;',  ''''
                    ),
                    '&quot;', '"'
                  ),
                  '&lt;', '<'
                ),
                '&gt;', '>'
              ),
              '&amp;', '&'
            )
WHERE value ~ '&(#x27;|#39;|quot;|lt;|gt;|amp;)';

-- Sanity check — should return 0 rows still containing entities.
SELECT COUNT(*) AS rows_still_with_entities
FROM public.translations
WHERE value ~ '&(#x27;|#39;|quot;|lt;|gt;|amp;)';
