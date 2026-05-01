-- =========================================================================
-- Seed English UI strings into public.translations.
-- entity_type = 'ui', entity_id = NULL for global UI strings.
--
-- Run in Supabase SQL Editor after i18n-extensions.sql.
-- Idempotent: ON CONFLICT (entity_type, entity_id, field, language) DO UPDATE.
-- =========================================================================

-- The unique constraint uses entity_id which is NOT NULL in the constraint.
-- Use a synthetic UUID for global UI strings.
DO $$
DECLARE
  UI_ID CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

  INSERT INTO public.translations (entity_type, entity_id, field, language, value) VALUES
    -- Navigation
    ('ui', UI_ID, 'nav.home',              'en', 'Home'),
    ('ui', UI_ID, 'nav.blog',              'en', 'Blog'),
    ('ui', UI_ID, 'nav.tours',             'en', 'Tours'),
    ('ui', UI_ID, 'nav.stops',             'en', 'Stops'),
    -- Blog
    ('ui', UI_ID, 'blog.index.title',      'en', 'Layover Guides'),
    ('ui', UI_ID, 'blog.index.description','en', 'Amsterdam layover tips, canal walk guides, and everything you need to turn a Schiphol stopover into an unforgettable experience.'),
    ('ui', UI_ID, 'blog.empty',            'en', 'No articles published yet.'),
    -- Stops
    ('ui', UI_ID, 'stops.empty',           'en', 'No stops yet.'),
    -- Site
    ('ui', UI_ID, 'site.tagline',          'en', 'Curated Amsterdam layovers'),
    ('ui', UI_ID, 'footer.back_to_site',   'en', '← Back to site'),
    -- French
    ('ui', UI_ID, 'nav.home',              'fr', 'Accueil'),
    ('ui', UI_ID, 'nav.blog',              'fr', 'Blog'),
    ('ui', UI_ID, 'nav.tours',             'fr', 'Circuits'),
    ('ui', UI_ID, 'nav.stops',             'fr', 'Étapes'),
    ('ui', UI_ID, 'blog.index.title',      'fr', 'Guides de Layover'),
    ('ui', UI_ID, 'blog.index.description','fr', 'Conseils Amsterdam, guides canaux et tout ce qu''il faut pour transformer une escale à Schiphol en expérience inoubliable.'),
    ('ui', UI_ID, 'blog.empty',            'fr', 'Aucun article publié pour l''instant.'),
    ('ui', UI_ID, 'site.tagline',          'fr', 'Escales Amsterdam sur mesure'),
    ('ui', UI_ID, 'footer.back_to_site',   'fr', '← Retour au site'),
    -- Dutch
    ('ui', UI_ID, 'nav.home',              'nl', 'Home'),
    ('ui', UI_ID, 'nav.blog',              'nl', 'Blog'),
    ('ui', UI_ID, 'nav.tours',             'nl', 'Rondleidingen'),
    ('ui', UI_ID, 'site.tagline',          'nl', 'Samengestelde Amsterdam-tussenstops'),
    ('ui', UI_ID, 'blog.index.title',      'nl', 'Layover Gidsen'),
    ('ui', UI_ID, 'blog.empty',            'nl', 'Nog geen artikelen gepubliceerd.'),
    -- German
    ('ui', UI_ID, 'nav.home',              'de', 'Startseite'),
    ('ui', UI_ID, 'nav.tours',             'de', 'Touren'),
    ('ui', UI_ID, 'site.tagline',          'de', 'Kuratierte Amsterdam-Zwischenstopps'),
    ('ui', UI_ID, 'blog.index.title',      'de', 'Layover-Ratgeber'),
    ('ui', UI_ID, 'blog.empty',            'de', 'Noch keine Artikel veröffentlicht.'),
    -- Spanish
    ('ui', UI_ID, 'nav.home',              'es', 'Inicio'),
    ('ui', UI_ID, 'nav.tours',             'es', 'Tours'),
    ('ui', UI_ID, 'site.tagline',          'es', 'Escalas en Ámsterdam seleccionadas'),
    ('ui', UI_ID, 'blog.index.title',      'es', 'Guías de Escala'),
    ('ui', UI_ID, 'blog.empty',            'es', 'No hay artículos publicados aún.'),
    -- Italian
    ('ui', UI_ID, 'nav.home',              'it', 'Home'),
    ('ui', UI_ID, 'nav.tours',             'it', 'Tour'),
    ('ui', UI_ID, 'site.tagline',          'it', 'Soste ad Amsterdam su misura'),
    ('ui', UI_ID, 'blog.index.title',      'it', 'Guide per Scali'),
    ('ui', UI_ID, 'blog.empty',            'it', 'Nessun articolo pubblicato ancora.'),
    -- Portuguese
    ('ui', UI_ID, 'nav.home',              'pt', 'Início'),
    ('ui', UI_ID, 'nav.tours',             'pt', 'Tours'),
    ('ui', UI_ID, 'site.tagline',          'pt', 'Escalas em Amesterdão selecionadas'),
    ('ui', UI_ID, 'blog.index.title',      'pt', 'Guias de Escala'),
    ('ui', UI_ID, 'blog.empty',            'pt', 'Ainda não há artigos publicados.'),
    -- Chinese
    ('ui', UI_ID, 'nav.home',              'zh', '首页'),
    ('ui', UI_ID, 'nav.tours',             'zh', '旅游'),
    ('ui', UI_ID, 'site.tagline',          'zh', '精选阿姆斯特丹中转游'),
    ('ui', UI_ID, 'blog.index.title',      'zh', '中转指南'),
    ('ui', UI_ID, 'blog.empty',            'zh', '暂无发布的文章。')
  ON CONFLICT (entity_type, entity_id, field, language) DO UPDATE
    SET value = EXCLUDED.value;

END $$;

-- Sanity check.
SELECT COUNT(*) AS ui_strings FROM public.translations WHERE entity_type = 'ui';
