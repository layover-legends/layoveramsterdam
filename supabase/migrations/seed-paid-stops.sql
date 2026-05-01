-- =========================================================================
-- Seed 55 paid/bookable stops from LayoverAmsterdam_Partners_v2.pdf
-- into public.destinations with requires_booking = TRUE.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING — safe to re-run.
-- =========================================================================

-- 1) Add the Museums category (not in original taxonomy).
INSERT INTO public.destination_categories (name, slug) VALUES
  ('Museums & Culture', 'museums')
ON CONFLICT (slug) DO NOTHING;

-- 2) Seed paid stops.
WITH stops (cat, name, area, description, is_seasonal) AS (VALUES

  -- MUSÉES (21 paid — Galerie des Gardes Civiques is free, already seeded)
  ('museums', 'Rijksmuseum',                    'Museum Quarter',   'La plus grande collection d''art néerlandais au monde. Rembrandt, Vermeer, Hals.',                       FALSE),
  ('museums', 'Musée Van Gogh',                 'Museum Quarter',   'La plus grande collection Van Gogh au monde. Réservation obligatoire.',                                  FALSE),
  ('museums', 'Maison d''Anne Frank',           'Jordaan',          'Journal d''Anne Frank — monument historique de la Seconde Guerre Mondiale. Réservation semaines à l''avance.', FALSE),
  ('museums', 'Stedelijk Museum',               'Museum Quarter',   'Art moderne et contemporain depuis 1895. Mondrian, De Kooning, Andy Warhol.',                             FALSE),
  ('museums', 'Moco Museum',                    'Museum Quarter',   'Banksy & art moderne. Exposition immersive très populaire.',                                              FALSE),
  ('museums', 'Église Clandestine — Ons'' Lieve Heer', 'Old Centre','Église catholique secrète construite dans un grenier du 17e siècle.',                                   FALSE),
  ('museums', 'Musée Historique Juif',          'Jewish Quarter',   'Histoire de la communauté juive d''Amsterdam de 1600 à aujourd''hui.',                                   FALSE),
  ('museums', 'NEMO Science Museum',            'Old Harbour',      'Musée des sciences interactif sur 5 étages. Idéal familles et enfants.',                                 FALSE),
  ('museums', 'FOAM Photography Museum',        'Canal Ring',       'Musée photo de renommée mondiale. Expositions temporaires et permanentes.',                               FALSE),
  ('museums', 'Allard Pierson Museum',          'City Centre',      'Antiquités grecques, romaines, égyptiennes et du Proche-Orient.',                                        FALSE),
  ('museums', 'EYE Film Museum',                'Noord',            'Architecture spectaculaire en forme d''œil. Traversée gratuite en ferry depuis la gare.',                 FALSE),
  ('museums', 'Verzetsmuseum',                  'Plantage',         'Musée de la Résistance néerlandaise. Comment les Hollandais ont résisté à l''occupation nazie.',         FALSE),
  ('museums', 'Tropenmuseum',                   'East Amsterdam',   'Art et cultures du monde entier. Collections Afrique, Asie, Amérique latine.',                           FALSE),
  ('museums', 'Micropia',                       'Plantage',         'Seul musée des microbes au monde. Dans le zoo Artis.',                                                    FALSE),
  ('museums', 'Electric Ladyland',              'Jordaan',          'Musée de l''art fluorescent. Expérience unique et psychédélique.',                                        FALSE),
  ('museums', 'Tassenmuseum',                   'Canal Ring',       'Musée des sacs à main et accessoires. Collection unique du 16e siècle à aujourd''hui.',                  FALSE),
  ('museums', 'Hash Marihuana & Hemp Museum',   'Old Centre',       'Histoire complète du cannabis et du chanvre. Le plus vieux musée cannabis au monde.',                    FALSE),
  ('museums', 'Amsterdam Dungeon',              'Old Centre',       'Expérience immersive sur les histoires sombres d''Amsterdam. 500 ans d''histoire sinistre.',             FALSE),
  ('museums', 'Artis Planetarium',              'Plantage',         'Planétarium inclus dans le billet du zoo Artis. Spectacles astronomiques.',                              FALSE),
  ('museums', 'Musée de la Pipe',               'Canal Ring',       'Collection unique de pipes et accessoires du tabac du 16e au 20e siècle.',                               FALSE),
  ('museums', 'Houseboat Museum',               'Canal Ring',       'Vie quotidienne sur une péniche. L''unique musée bateau habitable d''Amsterdam.',                        FALSE),

  -- ACTIVITÉS & EXPÉRIENCES (14 unique paid activities)
  ('activities', 'Croisière Canal Privée',       'Canal Ring',       'Croisière en bateau privé sur les canaux UNESCO. Tarif groupe à négocier.',                              FALSE),
  ('activities', 'Balade Vélo Guidée',           'City Centre',      'Vélo journée sur les canaux et quartiers. La meilleure façon de voir Amsterdam.',                        FALSE),
  ('activities', 'Kayak sur les Canaux',         'Canal Ring',       'Exploration des canaux en kayak. Vue unique depuis l''eau.',                                              FALSE),
  ('activities', 'Atelier Cuisine Hollandaise',  'Jordaan',          'Cours de cuisine néerlandaise en groupe. Harengs, stamppot, poffertjes.',                                FALSE),
  ('activities', 'Atelier Sabots — Klompen',     'City Centre',      'Fabrication de sabots en bois traditionnels néerlandais.',                                               FALSE),
  ('activities', 'Moulin de Sloten',             'West Amsterdam',   'Moulin à vent du 18e siècle encore en activité. Visite guidée de l''intérieur.',                        FALSE),
  ('activities', 'Heineken Experience',          'De Pijp',          'Brasserie historique Heineken reconvertie en musée interactif. 2 bières incluses.',                     FALSE),
  ('activities', 'Patinoire Plein Air',          'Museum Quarter',   'Patinoire en plein air face au Rijksmuseum. Novembre–février uniquement.',                              TRUE),
  ('activities', 'Johan Cruyff Arena',           'South-East',       'Stade de l''Ajax — le temple du football néerlandais. Visites guidées régulières.',                     FALSE),
  ('activities', 'Escape Room Amsterdam',        'City Centre',      'Escape room sur les thèmes historiques d''Amsterdam. Expérience unique en groupe.',                     FALSE),
  ('activities', 'Atelier Fromage',              'Jordaan',          'Fabriquer son propre Gouda. Dégustation incluse.',                                                       FALSE),
  ('activities', 'Distillerie Bols',             'Museum Quarter',   'Plus ancienne distillerie de genièvre au monde (1575). Dégustation incluse.',                           FALSE),
  ('activities', 'Vélo Électrique Guidé',        'City Centre',      'Tour en vélo électrique. Idéal pour les layovers courts — couvre plus de terrain.',                     FALSE),
  ('activities', 'Atelier Poterie Delft',        'City Centre',      'Peindre sa propre faïence de Delft à emporter. Souvenir unique fait main.',                             FALSE),

  -- NATURE & PARCS (4 paid nature stops)
  ('nature', 'Keukenhof — Jardins de Tulipes',  'Lisse',            'Plus grand jardin de fleurs au monde. 7 millions de bulbes. Mars–mai uniquement.',                      TRUE),
  ('nature', 'Hortus Botanicus',                'Plantage',         'Jardin botanique de 1638. Papillons tropicaux, plantes médicinales, serre historique.',                  FALSE),
  ('nature', 'Zoo Artis',                       'Plantage',         'Plus vieux zoo des Pays-Bas (1838). 700 espèces, aquarium, planétarium inclus.',                         FALSE),
  ('nature', 'Château de Muiderslot',           'Muiden',           'Château médiéval du 13e siècle à 20 min d''Amsterdam. Visite guidée en costume.',                       FALSE),

  -- SPIRITUALITÉ & CULTURE PAYANTE (7)
  ('religion',      'Synagogue Portugaise-Israélite',   'Jewish Quarter', 'Synagogue du 17e siècle éclairée uniquement à la bougie. Architecture somptueuse.',        FALSE),
  ('religion',      'Nieuwe Kerk',                      'City Centre',    'Église du 15e siècle sur la place du Dam. Expositions temporaires de haut niveau.',        FALSE),
  ('religion',      'Oude Kerk — Intérieur',            'Old Centre',     'La plus ancienne église d''Amsterdam (1306). Orgue baroque, tombes de marins.',            FALSE),
  ('religion',      'Westerkerk — Tour',                'Jordaan',        'Vue panoramique sur Amsterdam depuis la tour. Anne Frank l''entendait sonner.',            FALSE),
  ('architecture',  'Het Schip — Intérieur',            'Westerpark',     'Intérieur du chef-d''œuvre de l''Amsterdam School. Logements sociaux de 1920.',           FALSE),
  ('architecture',  'Beurs van Berlage — Intérieur',    'City Centre',    'Intérieur Art Nouveau de la bourse de 1903. Fresques, colonnes, coupole.',                FALSE),
  ('monuments',     'Palais Royal',                     'City Centre',    'Palais du 17e siècle sur la place du Dam. Intérieur officiel de la monarchie néerlandaise.', FALSE),

  -- FOOD & EXPÉRIENCES CULINAIRES PAYANTES (4 unique)
  ('food', 'Déjeuner Bruin Café',             'Jordaan',        'Menu groupe dans un café brun traditionnel. L''expérience culinaire hollandaise authentique.',         FALSE),
  ('food', 'Dégustation Jenever Guidée',      'City Centre',    'Dégustation de 3 jenevers millésimés chez Wynand Fockink. Guide et explication inclus.',              FALSE),
  ('food', 'Rijsttafel Indonésienne',         'Various',        'Festin indonésien de 20 petits plats. Héritage colonial néerlandais. Expérience unique.',             FALSE),
  ('food', 'Concert Concertgebouw',           'Museum Quarter', 'Concert dans l''une des meilleures salles acoustiques du monde. Mercredi midi = gratuit.',            FALSE)

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
  TRUE    AS is_active,
  TRUE    AS requires_booking,
  FALSE   AS is_adult_only,
  s.is_seasonal,
  FALSE   AS wheelchair_accessible
FROM stops s
JOIN public.destination_categories dc ON dc.slug = s.cat
ON CONFLICT (slug) DO NOTHING;

-- Sanity check.
SELECT COUNT(*) AS paid_destinations FROM public.destinations WHERE requires_booking = TRUE;
