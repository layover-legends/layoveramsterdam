-- =========================================================================
-- Free Stops catalog — 112 free destinations across Amsterdam.
-- Source: LayoverAmsterdam_Gratuits_v2.pdf (internal catalogue v2).
-- Run once in Supabase SQL Editor. Idempotent: safe to re-run.
-- =========================================================================

-- 1) Category enum (one of 11 buckets from the catalog).
DO $$ BEGIN
  CREATE TYPE public.free_stop_category AS ENUM (
    'monuments', 'canals', 'neighborhoods', 'food', 'bars',
    'architecture', 'experiences', 'hidden_gems', 'shopping',
    'nature', 'religion'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Table.
CREATE TABLE IF NOT EXISTS public.free_stops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  neighborhood  TEXT,
  description   TEXT,
  category      public.free_stop_category NOT NULL,
  lat           NUMERIC(9,6),
  lng           NUMERIC(9,6),
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, category)
);

CREATE INDEX IF NOT EXISTS free_stops_category_idx     ON public.free_stops (category);
CREATE INDEX IF NOT EXISTS free_stops_neighborhood_idx ON public.free_stops (neighborhood);
CREATE INDEX IF NOT EXISTS free_stops_is_active_idx    ON public.free_stops (is_active);

-- 3) Auto-update updated_at on UPDATE.
DROP TRIGGER IF EXISTS set_free_stops_updated_at ON public.free_stops;
CREATE TRIGGER set_free_stops_updated_at
  BEFORE UPDATE ON public.free_stops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS — admins read/write all, public can read only is_active rows.
ALTER TABLE public.free_stops ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='free_stops' AND policyname='Public reads active stops') THEN
    CREATE POLICY "Public reads active stops" ON public.free_stops
      FOR SELECT USING (is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='free_stops' AND policyname='Admins manage stops') THEN
    CREATE POLICY "Admins manage stops" ON public.free_stops
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 5) Seed: 112 stops. ON CONFLICT keeps it idempotent.
INSERT INTO public.free_stops (name, neighborhood, description, category) VALUES
-- MONUMENTS & LANDMARKS (11)
('Dam Square', 'City Centre', 'Cœur historique — Palais Royal, Monument National, 700 ans d''histoire.', 'monuments'),
('Tour de la Monnaie — Munttoren', 'City Centre', 'Tour médiévale, carillon du 17e siècle toutes les demi-heures.', 'monuments'),
('Tour des Pleureuses', 'Old Harbour', 'Tour du 15e siècle. Départ des marins vers les Indes. Aujourd''hui bar à vin.', 'monuments'),
('Monument National', 'Dam Square', 'Obélisque en mémoire des victimes de la 2e Guerre Mondiale.', 'monuments'),
('Magere Brug — Pont Maigre', 'Amstel', 'Pont levis le plus iconique d''Amsterdam. Éclairé de 400 ampoules la nuit.', 'monuments'),
('Amsterdam Centraal', 'City Centre', 'La gare elle-même est un monument néo-gothique de 1889. Architecture époustouflante.', 'monuments'),
('Beurs van Berlage — Extérieur', 'City Centre', 'Ancienne bourse 1903, chef-d''œuvre Art Nouveau. Extérieur en visite libre.', 'monuments'),
('Koninklijk Theater Carré', 'Amstel', 'Théâtre circulaire du 19e siècle au bord de l''Amstel. Extérieur spectaculaire.', 'monuments'),
('Basilique Saint-Nicolas', 'City Centre', 'Face à la gare centrale. Souvent ignorée — intérieur baroque remarquable.', 'monuments'),
('Amstelkerk', 'Canal Ring', 'Église temporaire de 1668 jamais remplacée. Toujours debout 350 ans plus tard.', 'monuments'),
('De Gooyer Windmill', 'East Amsterdam', 'Moulin à vent dans la ville, à côté de la Brouwerij ''t IJ. Extérieur libre.', 'monuments'),

-- CANAUX & SCÈNES DE RUE (11)
('Herengracht — La Courbe d''Or', 'Canal Ring', 'Le plus beau tronçon de canal. Maisons de marchands du 17e siècle.', 'canals'),
('Prinsengracht', 'Canal Ring', 'Le canal des princes — péniches, terrasses, marchés du samedi.', 'canals'),
('Keizersgracht', 'Canal Ring', 'Le canal de l''Empereur — le plus large de l''anneau UNESCO.', 'canals'),
('7 Ponts — Reguliersgracht', 'Canal Ring', '7 ponts en enfilade depuis un seul point de vue. Le plus photographié.', 'canals'),
('Brouwersgracht', 'Jordaan', 'Élu plus beau canal par les Amsterdamois eux-mêmes.', 'canals'),
('Oudeschans & Montelbaanstoren', 'Jewish Quarter', 'Canal authentique, tour du 16e siècle dessinée par Rembrandt.', 'canals'),
('Leidsegracht', 'Canal Ring', 'Petit canal romantique, moins fréquenté, très photogénique.', 'canals'),
('Borneo-Sporenburg', 'East Amsterdam', 'Quartier d''architecture contemporaine sur l''eau, années 90. Promenade libre.', 'canals'),
('Java Island — Promenade', 'Old Harbour', 'Île artificielle avec architecture de 50 pays différents. Balade gratuite.', 'canals'),
('Silodam — Extérieur', 'Old Harbour', 'Immeuble résidentiel iconique dans l''eau. Architecture spectaculaire depuis le quai.', 'canals'),
('Westerdok', 'Old Harbour', 'Quartier résidentiel sur l''eau, architecture contemporaine. Promenade libre.', 'canals'),

-- QUARTIERS À EXPLORER (13)
('Jordaan — Le Quartier Bohème', 'West Amsterdam', 'Rues étroites, ateliers, galeries, cafés. Le quartier le plus recherché.', 'neighborhoods'),
('De Pijp — Le Quartier Latin', 'South Amsterdam', 'Multiculturel et jeune. Bars, restos du monde, marché Albert Cuyp.', 'neighborhoods'),
('Begijnhof — La Cour Secrète', 'City Centre', 'Cour médiévale cachée. Maison en bois de 1420, la plus ancienne des P-B.', 'neighborhoods'),
('Les 9 Rues (De 9 Straatjes)', 'Canal Ring', '9 ruelles transversales. Boutiques vintage, créateurs, chocolatiers.', 'neighborhoods'),
('Plantage — Le Quartier Vert', 'East Amsterdam', 'Quartier botanique, allées arborées, Zoo Artis, Hortus Botanicus.', 'neighborhoods'),
('Waterlooplein & Quartier Juif', 'Jewish Quarter', 'Marché aux puces + vestiges du quartier juif d''Amsterdam.', 'neighborhoods'),
('Oud-West — L''Authentique', 'West Amsterdam', 'Résidentiel, local, zéro touristes. Foodhallen, Kinkerstraat.', 'neighborhoods'),
('Vieux Centre — Oudezijds', 'Old Centre', 'Labyrinthe médiéval original. Ruelles, maisons penchées, Oude Kerk.', 'neighborhoods'),
('Amsterdam Noord', 'Noord', 'L''autre côté de l''IJ. NDSM Wharf, street art monumental, friche créative.', 'neighborhoods'),
('Indische Buurt', 'East Amsterdam', 'Quartier indonésien authentique. Architecture début 20e siècle, très local.', 'neighborhoods'),
('De Hallen', 'Oud-West', 'Ancienne remise de trams reconvertie en marché culturel. Entrée libre.', 'neighborhoods'),
('NDSM Wharf', 'Noord', 'Friche créative et artistique. Street art monumental, événements gratuits.', 'neighborhoods'),
('Marineterrein', 'Old Harbour', 'Ancien chantier naval reconverti en campus créatif. Balade libre.', 'neighborhoods'),

-- FOOD & MARCHÉS (18)
('Marché Albert Cuyp', 'De Pijp', 'Plus grand marché de rue NL. 260 stands, street food, fromages, fleurs.', 'food'),
('Noordermarkt (sam. matin)', 'Jordaan', 'Marché bio et vintage. Fromages fermiers, pain artisanal, vêtements vintage.', 'food'),
('Stand Haring — Harengs', 'City Centre', 'Street food nationale. Hareng cru, oignons, cornichons. Incontournable.', 'food'),
('Dégustation Fromage Gouda', 'City Centre', 'Dégustation chez un affineur : jeune, vieux, extra-vieux. Gratuit à l''entrée.', 'food'),
('Pancakes Hollandais', 'Jordaan', 'Pannenkoeken — énormes crêpes garnies. Déjeuner national néerlandais.', 'food'),
('Foodhallen', 'Oud-West', '21 stands gastronomiques dans une ancienne centrale de trams. Entrée libre.', 'food'),
('FEBO — Distributeur Croquettes', 'Various', 'Distributeur automatique de snacks chauds 24h/24. Street food iconique.', 'food'),
('Winkel 43 — Tarte aux Pommes', 'Jordaan', 'La tarte aux pommes la plus célèbre d''Amsterdam. Queue dehors — ça vaut.', 'food'),
('Patatje Oorlog — Frites', 'Various', 'Frites sauce cacahuète + mayo + oignons. Spécialité nationale incontournable.', 'food'),
('Poffertjes Stand', 'Various', 'Mini-crêpes au beurre et sucre glace. Différentes des pancakes, aussi bonnes.', 'food'),
('Surinamese Food — De Pijp', 'De Pijp', 'Meilleure cuisine surinamaise hors Suriname. Roti, moksi, bara.', 'food'),
('Marché Lindengracht (sam.)', 'Jordaan', 'Marché authentique du samedi, moins connu que Noordermarkt. Très local.', 'food'),
('Boerenmarkt Nieuwmarkt', 'Old Centre', 'Marché de producteurs locaux le samedi matin. Légumes bio, pain, fromages.', 'food'),
('Dappermarkt', 'East Amsterdam', 'Marché du quotidien le plus multiculturel. Classé monument historique.', 'food'),
('Warung Spang Makandra', 'De Pijp', 'Institution surinamaise depuis 1978. Entrée libre, cuisine à prix doux.', 'food'),
('Brandt & Levie', 'Jordaan', 'Meilleure charcuterie artisanale d''Amsterdam. Dégustation gratuite en boutique.', 'food'),
('De Kaaskamer', 'Canal Ring', 'Cave à fromages avec 400 variétés. Dégustation gratuite à l''entrée.', 'food'),
('Gelateria Jordino', 'Jordaan', 'Meilleure glace artisanale de la ville. Incontournable en été.', 'food'),

-- BARS & CAFÉS (11)
('Wynand Fockink (1679)', 'City Centre', 'Salle de dégustation jenever depuis 1679. Entrée libre, dégustation payante.', 'bars'),
('Café Papeneiland (1642)', 'Jordaan', 'Le plus vieux café brun d''Amsterdam. Carreaux de Delft originaux.', 'bars'),
('Brouwerij ''t IJ', 'East Amsterdam', 'Micro-brasserie dans un moulin à vent. Entrée libre, bières en sus.', 'bars'),
('Bar à Cocktails Jordaan', 'Jordaan', 'Cave intime, mixologie locale au jenever. Entrée libre.', 'bars'),
('Café Spécialité Local', 'Jordaan / De Pijp', 'Meilleur café de spécialité de la ville. Entrée libre.', 'bars'),
('Café de Jaren', 'City Centre', 'Grand café sur l''Amstel avec terrasse sur l''eau. Vue magnifique.', 'bars'),
('In de Wildeman', 'City Centre', 'Bar à bières artisanales depuis 1690. 18 bières pression, 250 bouteilles.', 'bars'),
('Bar Oldenhof', 'Jordaan', 'Jenever et cocktails dans une ancienne pharmacie Art Déco. Entrée libre.', 'bars'),
('Door 74', 'Canal Ring', 'Bar à cocktails secret, entrée sur réservation uniquement. Expérience unique.', 'bars'),
('Worst Wijncafé', 'De Pijp', 'Bar à saucisses artisanales et vins naturels. Concept unique à Amsterdam.', 'bars'),
('Concertgebouw — Mercredi Midi', 'Museum Quarter', 'Concert gratuit chaque mercredi midi dans l''une des meilleures salles du monde.', 'bars'),

-- ARCHITECTURE & DESIGN (6)
('ARCAM', 'Old Harbour', 'Centre d''architecture d''Amsterdam. Expositions permanentes gratuites.', 'architecture'),
('Het Schip — Extérieur', 'Westerpark', 'Chef-d''œuvre de l''Amsterdam School, architecture sociale 1920. Extérieur libre.', 'architecture'),
('OBA — Rooftop Panoramique', 'City Centre', 'Bibliothèque publique de 7 étages. Rooftop 360° gratuit avec vue imprenable.', 'architecture'),
('Stadsschouwburg', 'Leidseplein', 'Théâtre municipal du 19e siècle. Architecture impressionnante, extérieur libre.', 'architecture'),
('Oudemanhuispoort', 'City Centre', 'Passage couvert 18e siècle avec marché de livres anciens. Entrée libre.', 'architecture'),
('Fietsflat', 'City Centre', 'Parking vélos de 7 étages face à la gare. 10 000 vélos. Spectacle unique.', 'architecture'),

-- EXPÉRIENCES LOCALES & TRANSPORT (4)
('GVB Ferry — Traversée IJ', 'City Centre', 'Ferry gratuit 24h/24 toutes les 8 min. Vue unique sur Amsterdam depuis l''eau.', 'experiences'),
('IJ-hallen', 'Noord', 'Plus grand marché aux puces d''Europe. Un weekend par mois, entrée ~€5.', 'experiences'),
('Tram Historique (weekends)', 'Various', 'Ligne de tramway vintage les weekends. Traversée de la ville à l''ancienne.', 'experiences'),
('Galerie des Gardes Civiques', 'City Centre', 'Passage gratuit avec portraits de groupe du 17e siècle. Méconnu des touristes.', 'experiences'),

-- PÉPITES CACHÉES (13)
('Hofjes — Cours Secrètes', 'Various', '47 cours intérieures cachées du 17e siècle. Inconnues de la plupart des touristes.', 'hidden_gems'),
('Spui — La Place des Livres', 'City Centre', 'Librairies d''occasion, cafés intellectuels. Marché vendredi et dimanche.', 'hidden_gems'),
('La Maison la Plus Étroite (2m)', 'Old Centre', '2,02m de large — la plus étroite d''Europe. Une vraie maison habitée.', 'hidden_gems'),
('Claes Claesz Hofje', 'Jordaan', 'Cour du 17e siècle encore habitée. Accès discret autorisé.', 'hidden_gems'),
('Ancienne Centrale Électrique', 'Westerpark', 'Architecture industrielle 1899. Art Nouveau, tuyaux cuivre, mosaïques.', 'hidden_gems'),
('Atelier Diamant — Coster', 'Museum Quarter', 'Démonstration taille diamant. Entièrement gratuit, sans obligation d''achat.', 'hidden_gems'),
('Marché aux Fleurs — Bloemenmarkt', 'City Centre', 'Seul marché flottant du monde sur le Singel depuis 1862.', 'hidden_gems'),
('Poezenboot', 'Canal Ring', 'Bateau refuge pour chats sur le canal. Unique au monde. Visite gratuite.', 'hidden_gems'),
('Amstelkerk — Intérieur', 'Canal Ring', 'Église temporaire de 1668 jamais remplacée. Intérieur accessible librement.', 'hidden_gems'),
('De Krijtberg', 'City Centre', 'Église jésuite cachée derrière une façade banale. Intérieur baroque somptueux.', 'hidden_gems'),
('Mozes en Aäronkerk', 'Waterlooplein', 'Église néoclassique spectaculaire sur le Waterlooplein. Entrée libre.', 'hidden_gems'),
('REM Eiland — Extérieur', 'Houthavens', 'Ancienne plateforme pétrolière reconvertie. Vue sur le port depuis le quai.', 'hidden_gems'),
('Nemo Roof Terrace', 'Old Harbour', 'Toit de NEMO accessible gratuitement en été. Plage urbaine avec vue panoramique.', 'hidden_gems'),

-- SHOPPING LOCAL (13)
('Les 9 Rues — Boutiques Créateurs', 'Canal Ring', 'Boutiques indépendantes. Créateurs, antiquaires, chocolatiers.', 'shopping'),
('Marché aux Puces Waterlooplein', 'Jewish Quarter', 'Plus vieux marché aux puces d''Europe (1880). Vinyles, vintage, curiosités.', 'shopping'),
('Boutique Delft Authentique', 'City Centre', 'Faïence peinte à la main. Vérifier le logo royal sous le fond.', 'shopping'),
('Librairies d''Occasion', 'Spui / Old Centre', 'Gravures Amsterdam du 17e siècle entre €20 et €200. Unique.', 'shopping'),
('Fromagerie Artisanale', 'Jordaan', 'Gouda, Edam, Leyden directement chez l''affineur. Dégustation gratuite.', 'shopping'),
('Cave à Jenever', 'City Centre', 'Bouteilles millésimées introuvables hors Pays-Bas.', 'shopping'),
('Frozen Fountain', 'Canal Ring', 'Meilleur design néerlandais contemporain. Galerie et boutique, entrée libre.', 'shopping'),
('Mendo', 'Canal Ring', 'La plus belle librairie art & design d''Amsterdam. Entrée libre.', 'shopping'),
('Jutka & Riska', 'Jordaan', 'Friperie légendaire du Jordaan depuis 1978. Trésors vintage.', 'shopping'),
('Capsicum', 'Old Centre', 'Tissus du monde entier. Paradis des créateurs de mode.', 'shopping'),
('Eduard Kramer', 'Canal Ring', 'Carreaux de Delft anciens, certains datent du 17e siècle.', 'shopping'),
('Posthumus', 'City Centre', 'Papeterie et tampons depuis 1892. Unique en Europe.', 'shopping'),
('Het Fort van Sjakoo', 'Nieuwmarkt', 'Librairie anarchiste et alternative depuis 1977. Une institution.', 'shopping'),

-- NATURE & PARCS (8)
('Vondelpark', 'Museum Quarter', '47 hectares, étangs, roseries. Concerts gratuits en été le vendredi soir.', 'nature'),
('Forêt d''Amsterdam', 'South Amsterdam', '2400 ha de forêt plantée à la main dans les années 1930.', 'nature'),
('Bord de l''IJ — Vue Port', 'Old Harbour', 'Front de mer historique. Ferry gratuit 24h/24 vers l''EYE Film Museum.', 'nature'),
('Amsterdamse Bos — Ferme Chèvres', 'South Amsterdam', 'Ferme pédagogique gratuite dans la forêt d''Amsterdam. Idéal familles.', 'nature'),
('Gaasperpark', 'South-East', 'Parc naturel avec lac. Moins connu que le Vondelpark, très local.', 'nature'),
('Flevopark', 'East Amsterdam', 'Parc populaire local avec buvette au bord de l''eau.', 'nature'),
('Amstelpark', 'South Amsterdam', 'Roses, moulin, mini-golf. Très familial et calme.', 'nature'),
('Sloterplas', 'West Amsterdam', 'Lac artificiel entouré de parcs. Baignade en été, gratuit.', 'nature'),

-- SPIRITUALITÉ & RELIGION (4)
('De Krijtberg — Église', 'City Centre', 'Église jésuite cachée. Intérieur baroque somptueux. Entrée libre.', 'religion'),
('Mozes en Aäronkerk — Église', 'Waterlooplein', 'Église néoclassique spectaculaire. Entrée libre.', 'religion'),
('Nieuwe Apostolische Kerk', 'Various', 'Architecture surprenante années 60. Entrée libre lors des offices.', 'religion'),
('Mosque As-Soennah', 'De Pijp', 'Grande mosquée du Pijp. Architecture remarquable. Extérieur libre.', 'religion')
ON CONFLICT (name, category) DO NOTHING;

-- 6) Sanity check
SELECT category, COUNT(*) AS stop_count
  FROM public.free_stops
 GROUP BY category
 ORDER BY category;
