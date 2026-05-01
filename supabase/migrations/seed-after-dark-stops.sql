-- =========================================================================
-- Seed 67 adult (+18) stops from LayoverAmsterdam_AfterDark_18plus.pdf
-- into public.destinations with is_adult_only = TRUE.
--
-- All entries are 100% legal under Dutch law. Age verification is handled
-- by partner establishments — LayoverAmsterdam guides inform and orient only.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING — safe to re-run.
-- For stops already in the DB under a different category (e.g. Wynand Fockink
-- as 'bars'), a separate UPDATE at the bottom sets is_adult_only = TRUE.
-- =========================================================================

-- 1) Add after-dark-specific categories.
INSERT INTO public.destination_categories (name, slug) VALUES
  ('Coffee Shops',      'coffee-shops'),
  ('Red Light District','red-light'),
  ('Nightlife',         'nightlife')
ON CONFLICT (slug) DO NOTHING;

-- 2) Insert new after-dark destinations.
WITH stops (cat, name, area, description, requires_booking, is_seasonal) AS (VALUES

  -- COFFEE SHOPS & CANNABIS (11) — free entry, age-verified by establishment
  ('coffee-shops', 'Bulldog — L''Original',       'Leidseplein',        'Institution mondiale depuis 1975. Le coffee shop le plus connu au monde.',               FALSE, FALSE),
  ('coffee-shops', 'Paradox',                     'Jordaan',            'Le plus local et authentique. Ambiance de quartier, loin du tourisme de masse.',         FALSE, FALSE),
  ('coffee-shops', 'Boerejongens',                'Oud-West',           'Élu meilleur coffee shop des Pays-Bas. Sélection primée, qualité premium.',               FALSE, FALSE),
  ('coffee-shops', 'Grey Area',                   'Old Centre',         'Fondé par 2 New-Yorkais en 1994. Minuscule, légendaire, toujours une file dehors.',       FALSE, FALSE),
  ('coffee-shops', 'Dampkring',                   'Canal Ring',         'Décor steampunk unique. Vu dans Ocean''s Twelve avec George Clooney.',                    FALSE, FALSE),
  ('coffee-shops', 'Barney''s',                   'Haarlemmerstraat',   'Récompensé Cannabis Cup. Terrasse au bord d''un canal.',                                  FALSE, FALSE),
  ('coffee-shops', 'The Greenhouse',              'Old Centre',         'Chaîne haut de gamme. Sélection énorme, plusieurs adresses dans la ville.',               FALSE, FALSE),
  ('coffee-shops', 'Siberië',                     'Jordaan',            'Un des plus anciens coffee shops d''Amsterdam (1984). Ambiance très locale.',             FALSE, FALSE),
  ('coffee-shops', 'Sensi Seeds',                 'Old Centre',         'Plus grande banque de graines de cannabis au monde. Boutique et musée.',                  FALSE, FALSE),
  ('coffee-shops', 'Smart Shop Kokopelli',        'Old Centre',         'Truffes magiques légales, herbes, cactus. Conseil professionnel sur place.',              FALSE, FALSE),
  ('coffee-shops', 'Bulldog Hotel & Bar',         'Leidseplein',        'L''empire Bulldog complet — hôtel, bar, coffee shop. Complexe touristique emblématique.', FALSE, FALSE),

  -- RED LIGHT DISTRICT (10 — Hash Museum already seeded under museums)
  ('red-light', 'Visite Guidée RLD',              'Old Centre',         'Histoire du quartier depuis le 14e siècle. Guide accompagne et explique — entrée libre.',  FALSE, FALSE),
  ('red-light', 'Prostitutie Museum',             'Old Centre',         'Intérieur reconstitué d''une vraie vitrine. Histoire et témoignages des travailleuses.',  TRUE,  FALSE),
  ('red-light', 'Red Light Secrets Museum',       'Old Centre',         'Musée immersif sur les histoires cachées du Red Light District.',                         TRUE,  FALSE),
  ('red-light', 'Condomerie Het Gulden Vlies',    'Old Centre',         'Première boutique de préservatifs au monde (1987). Entrée libre, collection unique.',     FALSE, FALSE),
  ('red-light', 'Casa Rosso — Théâtre Érotique',  'Old Centre',         'Show légendaire depuis 1970. Spectacle érotique légal le plus connu d''Europe.',          TRUE,  FALSE),
  ('red-light', 'Bananenbar',                     'Old Centre',         'Institution du Red Light District depuis les années 70. Bar spectacle légendaire.',       TRUE,  FALSE),
  ('red-light', 'Sex Museum Amsterdam',           'Old Centre',         'Plus vieux musée du sexe au monde (1985). 5 étages d''histoire de la sexualité.',         TRUE,  FALSE),
  ('red-light', 'Erotic Museum',                  'Old Centre',         '5 étages d''art érotique incluant des dessins originaux de John Lennon.',                 TRUE,  FALSE),
  ('red-light', 'Amsterdam Tattoo Museum',        'Old Centre',         'Seul musée du tatouage aux Pays-Bas. Histoire complète de l''art du tatouage.',           TRUE,  FALSE),
  ('red-light', 'Oude Kerk au cœur du RLD',       'Old Centre',         'Église du 14e siècle (1306) entourée de vitrines rouges. Contraste saisissant.',         TRUE,  FALSE),

  -- ALCOOL, BARS & DISTILLERIES — new after-dark versions not already seeded
  ('bars', 'Wynand Fockink Proeflokaal',          'Old Centre',         'Tasting room jenever depuis 1679. 70 varieties, dégustation guidée. Entrée payante.',     TRUE,  FALSE),
  ('bars', 'Jenever Proeverij',                   'Old Centre',         '5 jenevers millésimés dégustés avec guide expert. Expérience unique.',                    TRUE,  FALSE),
  ('bars', 'Distillerie Bols After Dark',         'Museum Quarter',     'Visite nocturne de la plus ancienne distillerie (1575). Dégustation premium incluse.',    TRUE,  FALSE),

  -- NIGHTLIFE & SPECTACLES (10)
  ('nightlife', 'Paradiso',                       'Leidseplein',        'Concert et club dans une église protestante reconvertie. Salle mythique depuis 1968.',     TRUE,  FALSE),
  ('nightlife', 'Melkweg',                        'Leidseplein',        'Salle de concert dans une ancienne laiterie. Deux salles, programmation internationale.', TRUE,  FALSE),
  ('nightlife', 'Canvas Rooftop Bar',             'East Amsterdam',     'Bar rooftop au 7e étage de Volkshotel. Vue panoramique sur Amsterdam la nuit.',            FALSE, FALSE),
  ('nightlife', 'Shelter Club',                   'Noord',              'Club underground sous l''A''DAM Tower. Musique électronique, ambiance souterraine.',       TRUE,  FALSE),
  ('nightlife', 'AIR Amsterdam',                  'Old Centre',         'Club emblématique de la scène électro internationale. Résidents mondiaux.',                TRUE,  FALSE),
  ('nightlife', 'Jimmy Woo',                      'Leidseplein',        'Club asiatique chic avec plafond en miroir. DJ international, dress code strict.',         TRUE,  FALSE),
  ('nightlife', 'Comedy Café Amsterdam',          'City Centre',        'Stand-up en anglais, parfait pour un layover en soirée. Programmation régulière.',         TRUE,  FALSE),
  ('nightlife', 'Holland Casino Amsterdam',       'Max Euweplein',      'Seul casino légal d''Amsterdam. Roulette, poker, machines. Entrée gratuite, +18 requis.',  FALSE, FALSE),
  ('nightlife', 'Wasteland Festival',             'Various',            'Plus grande soirée fetish d''Europe. Évènement annuel légendaire.',                        TRUE,  TRUE),
  ('nightlife', 'Studio K',                       'East Amsterdam',     'Cinéma, club et bar alternatif étudiant. L''une des meilleures adresses underground.',    TRUE,  FALSE),

  -- DARKROOMS & CLUBS FETISH (5)
  ('nightlife', 'Church Amsterdam',               'Rembrandtplein',     'Club fetish gay légendaire avec darkroom. Ambiance unique, codes vestimentaires.',         TRUE,  FALSE),
  ('nightlife', 'Eagle Amsterdam',                'Warmoesstraat',      'Bar leather historique, un des plus vieux d''Europe. Entrée libre.',                       FALSE, FALSE),
  ('nightlife', 'Cuckoo''s Nest',                 'Old Centre',         'Institution fetish gay du Red Light District depuis 1980. Entrée libre.',                  FALSE, FALSE),
  ('nightlife', 'Web Bar',                        'Warmoesstraat',      'Bar leather underground très local. Ambiance authentique, sans chichi.',                   FALSE, FALSE),
  ('nightlife', 'Argos Bar',                      'Warmoesstraat',      'Plus vieux bar fetish gay d''Amsterdam (1979). Une institution historique.',                FALSE, FALSE),

  -- SWINGER CLUBS & LIFESTYLE (4)
  ('nightlife', 'Club Mystique',                  'Amsterdam Area',     'Plus grand swinger club des Pays-Bas. Couples et célibataires selon soirée.',               TRUE,  FALSE),
  ('nightlife', 'Spazio',                         'Amsterdam Area',     'Club lifestyle haut de gamme, dress code élégant. Réservation recommandée.',               TRUE,  FALSE),
  ('nightlife', 'Club Parenclub Jaimy',           'Noord',              'Club mixte avec soirées thématiques régulières. Ambiance accessible.',                     TRUE,  FALSE),
  ('nightlife', 'Sauna Nieuw Amsterdam',          'Amsterdam Area',     'Sauna mixte avec espaces privés. Discret et professionnel.',                                TRUE,  FALSE),

  -- SAUNAS & BAINS (3)
  ('activities', 'Sauna Deco',                    'Old Centre',         'Sauna gay dans un bâtiment Art Déco des années 20. Architecture remarquable.',              TRUE,  FALSE),
  ('activities', 'Thermos Sauna',                 'Canal Ring',         'Sauna gay historique, ouvert 24h/24. Institution d''Amsterdam depuis des décennies.',       TRUE,  FALSE),
  ('activities', 'Sauna Fenomeen',                'Jordaan',            'Sauna mixte et naturiste, ambiance détendue et non-commerciale.',                           TRUE,  FALSE),

  -- LGBTQ+ CULTURE & BARS (7)
  ('bars', 'Reguliersdwarsstraat',                'Canal Ring',         'La rue gay la plus célèbre — 15+ bars sur 200m. Cœur de la scène LGBTQ+.',               FALSE, FALSE),
  ('bars', 'Café ''t Mandje',                     'Warmoesstraat',      'Plus vieux bar gay du monde encore ouvert (depuis 1927). Musée vivant.',                   FALSE, FALSE),
  ('bars', 'Prik Amsterdam',                      'Spuistraat',         'Bar gay branché avec happy hour légendaire. Accueillant pour tous.',                       FALSE, FALSE),
  ('bars', 'Taboo Bar',                           'Canal Ring',         'Bar leather accessible, idéal pour découvrir la scène. Entrée libre.',                     FALSE, FALSE),
  ('bars', 'Queen''s Head',                       'Zeedijk',            'Bar drag queen avec shows en soirée. Programmation régulière, entrée libre.',               FALSE, FALSE),
  ('bars', 'NYX Hotel Bar',                       'City Centre',        'Bar LGBTQ+ moderne dans un hôtel design. Ouvert à tous, ambiance inclusive.',              FALSE, FALSE),
  ('bars', 'Gay Pride Canal Parade',              'Canal Ring',         'Plus grand Pride sur l''eau au monde. Chaque août sur les canaux d''Amsterdam.',            FALSE, TRUE),

  -- TATTOO STUDIOS (3 — Amsterdam Tattoo Museum already seeded under red-light)
  ('activities', 'Hanky Panky Tattoo',            'Old Centre',         'Studio de tatouage légendaire depuis 1969. Artistes parmi les meilleurs du monde.',        TRUE,  FALSE),
  ('activities', 'Electric Tattoo Amsterdam',     'Jordaan',            'Old school américain dans le Jordaan. Meilleurs artistes de la scène EU.',                  TRUE,  FALSE),
  ('activities', 'Heart of Gold Tattoo',          'Old Centre',         'Flash tattoos rapides à partir de €80. Parfait pour un souvenir de layover.',              TRUE,  FALSE),

  -- AUTRES EXPÉRIENCES ADULTES (2 — Holland Casino already seeded above)
  ('activities', 'Sexyland Amsterdam',            'Various',            'Espace culturel explorant la sexualité via l''art contemporain. Légal et encadré.',         TRUE,  FALSE),
  ('activities', 'Robodock Festival',             'Noord',              'Festival underground art, machines et feu. Évènement annuel unique en Europe.',             TRUE,  TRUE)

)
INSERT INTO public.destinations (
  category_id,
  name,
  slug,
  area,
  description,
  is_active,
  requires_booking,
  is_adult_only,
  is_seasonal,
  wheelchair_accessible
)
SELECT
  dc.id,
  s.name,
  public.slugify(s.name) || '-' || s.cat  AS slug,
  s.area,
  s.description,
  TRUE              AS is_active,
  s.requires_booking,
  TRUE              AS is_adult_only,
  s.is_seasonal,
  FALSE             AS wheelchair_accessible
FROM stops s
JOIN public.destination_categories dc ON dc.slug = s.cat
ON CONFLICT (slug) DO NOTHING;

-- 3) Mark existing bar stops that also appear in the after-dark catalog.
--    These were seeded earlier under the free catalog but should be flagged
--    is_adult_only = TRUE because alcohol is 18+ in NL.
UPDATE public.destinations
   SET is_adult_only = TRUE
 WHERE name IN (
   'Wynand Fockink',
   'In de Wildeman',
   'Brouwerij ''t IJ',
   'Door 74',
   'Bar Oldenhof',
   'Café de Jaren',
   'Concertgebouw — Mercredi Midi'
 );

-- Sanity check.
SELECT COUNT(*) AS adult_destinations FROM public.destinations WHERE is_adult_only = TRUE;
