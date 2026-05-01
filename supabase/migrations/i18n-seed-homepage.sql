-- =========================================================================
-- Homepage + StopsTeaser UI string translations.
-- Idempotent: ON CONFLICT DO UPDATE.
-- Run after i18n-seed-en.sql (same synthetic UUID for global UI strings).
-- =========================================================================

DO $$
DECLARE
  UI_ID CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

  INSERT INTO public.translations (entity_type, entity_id, field, language, value) VALUES

    -- ── English ─────────────────────────────────────────────────────────────
    ('ui', UI_ID, 'homepage.coming_soon',   'en', 'Coming Soon'),
    ('ui', UI_ID, 'homepage.tagline',       'en', 'Turn your Schiphol layover into a legend. Premium city tours between flights — launching soon.'),
    ('ui', UI_ID, 'homepage.go_to_account', 'en', 'Go to your account'),
    ('ui', UI_ID, 'homepage.signed_in_as',  'en', 'Signed in as {email}.'),
    ('ui', UI_ID, 'homepage.early_access',  'en', 'Join the early-access list. We''ll only email you once — when tours open.'),
    ('ui', UI_ID, 'homepage.auth_error',    'en', 'Sign-in didn''t complete. Please try again.'),
    ('ui', UI_ID, 'homepage.auth_required', 'en', 'Please sign in to view your account.'),
    ('ui', UI_ID, 'homepage.admin_only',    'en', 'That area is for admins only.'),
    ('ui', UI_ID, 'footer.copyright',       'en', '© {year} Layover Amsterdam. All rights reserved.'),
    ('ui', UI_ID, 'stops_teaser.discover',      'en', 'What you''ll discover'),
    ('ui', UI_ID, 'stops_teaser.free_count',    'en', '{count} free stops, hand-picked.'),
    ('ui', UI_ID, 'stops_teaser.description',   'en', 'Every layover, packed with the things Amsterdam does best — and every one of them is free. No tickets, no queues. Just the city.'),
    ('ui', UI_ID, 'stops_teaser.categories',    'en', 'Across {count} categories'),
    ('ui', UI_ID, 'stops_teaser.signup_cta',    'en', 'Sign up above to be the first to plan your tour when bookings open.'),

    -- ── French ──────────────────────────────────────────────────────────────
    ('ui', UI_ID, 'homepage.coming_soon',   'fr', 'Bientôt disponible'),
    ('ui', UI_ID, 'homepage.tagline',       'fr', 'Transformez votre escale à Schiphol en légende. Circuits premium entre deux vols — lancement imminent.'),
    ('ui', UI_ID, 'homepage.go_to_account', 'fr', 'Accéder à votre compte'),
    ('ui', UI_ID, 'homepage.signed_in_as',  'fr', 'Connecté en tant que {email}.'),
    ('ui', UI_ID, 'homepage.early_access',  'fr', 'Rejoignez la liste early access. Nous ne vous enverrons qu''un seul e-mail — à l''ouverture des réservations.'),
    ('ui', UI_ID, 'homepage.auth_error',    'fr', 'La connexion n''a pas abouti. Veuillez réessayer.'),
    ('ui', UI_ID, 'homepage.auth_required', 'fr', 'Veuillez vous connecter pour accéder à votre compte.'),
    ('ui', UI_ID, 'homepage.admin_only',    'fr', 'Cette zone est réservée aux administrateurs.'),
    ('ui', UI_ID, 'footer.copyright',       'fr', '© {year} Layover Amsterdam. Tous droits réservés.'),
    ('ui', UI_ID, 'stops_teaser.discover',      'fr', 'Ce que vous découvrirez'),
    ('ui', UI_ID, 'stops_teaser.free_count',    'fr', '{count} étapes gratuites, sélectionnées à la main.'),
    ('ui', UI_ID, 'stops_teaser.description',   'fr', 'Chaque escale, riche de ce qu''Amsterdam fait de mieux — et tout est gratuit. Sans billets, sans files. Juste la ville.'),
    ('ui', UI_ID, 'stops_teaser.categories',    'fr', 'Dans {count} catégories'),
    ('ui', UI_ID, 'stops_teaser.signup_cta',    'fr', 'Inscrivez-vous ci-dessus pour être le premier à planifier votre circuit à l''ouverture des réservations.'),

    -- ── Dutch ───────────────────────────────────────────────────────────────
    ('ui', UI_ID, 'homepage.coming_soon',   'nl', 'Binnenkort beschikbaar'),
    ('ui', UI_ID, 'homepage.tagline',       'nl', 'Maak van uw tussenstop op Schiphol een legende. Premium stadstours tussen vluchten — binnenkort beschikbaar.'),
    ('ui', UI_ID, 'homepage.go_to_account', 'nl', 'Naar uw account'),
    ('ui', UI_ID, 'homepage.early_access',  'nl', 'Meld u aan voor de vroege toegang. We sturen u slechts één e-mail — wanneer tours beschikbaar zijn.'),
    ('ui', UI_ID, 'stops_teaser.discover',      'nl', 'Wat u gaat ontdekken'),
    ('ui', UI_ID, 'stops_teaser.free_count',    'nl', '{count} gratis stops, zorgvuldig geselecteerd.'),
    ('ui', UI_ID, 'stops_teaser.description',   'nl', 'Elke tussenstop, vol met het beste van Amsterdam — en alles is gratis. Geen kaartjes, geen wachtrijen. Gewoon de stad.'),
    ('ui', UI_ID, 'stops_teaser.categories',    'nl', 'Verdeeld over {count} categorieën'),
    ('ui', UI_ID, 'footer.copyright',       'nl', '© {year} Layover Amsterdam. Alle rechten voorbehouden.'),

    -- ── German ──────────────────────────────────────────────────────────────
    ('ui', UI_ID, 'homepage.coming_soon',   'de', 'Demnächst verfügbar'),
    ('ui', UI_ID, 'homepage.tagline',       'de', 'Machen Sie Ihren Zwischenstopp in Schiphol zur Legende. Premium Stadttouren zwischen Flügen — bald verfügbar.'),
    ('ui', UI_ID, 'homepage.go_to_account', 'de', 'Zu Ihrem Konto'),
    ('ui', UI_ID, 'homepage.early_access',  'de', 'Tragen Sie sich in die Frühzugang-Liste ein. Wir schicken Ihnen nur eine E-Mail — wenn die Buchungen öffnen.'),
    ('ui', UI_ID, 'stops_teaser.discover',      'de', 'Was Sie entdecken werden'),
    ('ui', UI_ID, 'stops_teaser.free_count',    'de', '{count} kostenlose Stopps, handverlesen.'),
    ('ui', UI_ID, 'stops_teaser.description',   'de', 'Jeder Zwischenstopp, vollgepackt mit dem Besten Amsterdams — und alles ist kostenlos. Keine Tickets, keine Warteschlangen. Nur die Stadt.'),
    ('ui', UI_ID, 'stops_teaser.categories',    'de', 'In {count} Kategorien'),
    ('ui', UI_ID, 'footer.copyright',       'de', '© {year} Layover Amsterdam. Alle Rechte vorbehalten.'),

    -- ── Spanish ─────────────────────────────────────────────────────────────
    ('ui', UI_ID, 'homepage.coming_soon',   'es', 'Próximamente'),
    ('ui', UI_ID, 'homepage.tagline',       'es', 'Convierte tu escala en Schiphol en una leyenda. Tours premium por la ciudad entre vuelos — próximamente.'),
    ('ui', UI_ID, 'homepage.go_to_account', 'es', 'Ir a tu cuenta'),
    ('ui', UI_ID, 'homepage.early_access',  'es', 'Únete a la lista de acceso anticipado. Solo te enviaremos un correo — cuando abran las reservas.'),
    ('ui', UI_ID, 'stops_teaser.discover',      'es', 'Lo que descubrirás'),
    ('ui', UI_ID, 'stops_teaser.free_count',    'es', '{count} paradas gratuitas, seleccionadas a mano.'),
    ('ui', UI_ID, 'stops_teaser.description',   'es', 'Cada escala, llena de lo mejor de Ámsterdam — y todo es gratis. Sin entradas, sin colas. Solo la ciudad.'),
    ('ui', UI_ID, 'stops_teaser.categories',    'es', 'En {count} categorías'),
    ('ui', UI_ID, 'footer.copyright',       'es', '© {year} Layover Amsterdam. Todos los derechos reservados.')

  ON CONFLICT (entity_type, entity_id, field, language) DO UPDATE
    SET value = EXCLUDED.value;

END $$;

SELECT COUNT(*) AS ui_strings_total FROM public.translations WHERE entity_type = 'ui';
