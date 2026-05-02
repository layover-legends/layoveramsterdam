-- Phase 7d — Add EN source text to addons + allow 'addon' in translations
-- Run AFTER phase7d-addons.sql.

BEGIN;

-- ============================================================
-- Part 1 — Add EN source columns to addons table
-- ============================================================
-- The bulk-translate script reads source text from the entity table
-- (just like tours.name / tours.description). Add the same fields here.

ALTER TABLE public.addons
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS short_blurb TEXT;

-- ============================================================
-- Part 2 — Allow entity_type='addon' in translations CHECK
-- ============================================================

DO $$
DECLARE
  cons_name TEXT;
BEGIN
  SELECT con.conname INTO cons_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE rel.relname = 'translations'
     AND nsp.nspname = 'public'
     AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) ILIKE '%entity_type%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.translations DROP CONSTRAINT %I', cons_name);
  END IF;

  ALTER TABLE public.translations
    ADD CONSTRAINT translations_entity_type_check
    CHECK (entity_type IN ('destination', 'tour', 'article', 'ui', 'addon'));
END $$;

-- ============================================================
-- Part 3 — Seed EN source text for the 12 add-ons
-- ============================================================

UPDATE public.addons SET
  name = 'Photographer guide upgrade',
  short_blurb = 'Your guide doubles as a pro photographer. 30+ edited photos delivered after your tour.',
  description = 'Skip the awkward selfies. For an extra €49, your tour guide brings a real camera and an editorial eye, capturing you naturally throughout the day. We deliver 30+ professionally edited photos within 48 hours via private gallery — yours to keep, share, and print.'
WHERE slug = 'photographer-upgrade';

UPDATE public.addons SET
  name = 'AI travelogue souvenir',
  short_blurb = 'A custom photo book with AI-narrated story of your day, delivered after your tour.',
  description = 'A premium hardcover photo book combining your tour photos with a unique AI-written narrative of your Amsterdam day, told in your chosen voice. Includes the route map, stop notes, and a personalized cover. Printed and shipped within 10 days. The most beautiful way to remember your layover.'
WHERE slug = 'ai-travelogue';

UPDATE public.addons SET
  name = '24h bike rental',
  short_blurb = 'Genuine Amsterdam bike, 24 hours, lock and helmet included. €18 per person.',
  description = 'Pick up a real Amsterdam city bike from MacBike near Centraal Station and ride like a local for a full 24 hours. Includes a sturdy lock, optional helmet, and a basic insurance covering theft. Perfect for exploring on your own time before or after your tour.'
WHERE slug = 'bike-rental-day';

UPDATE public.addons SET
  name = 'Amsterdam transit day pass',
  short_blurb = '24h unlimited GVB metro, tram, and bus across Amsterdam. €9 per person.',
  description = 'Unlimited rides on Amsterdam''s metro, tram, and bus network for 24 consecutive hours, valid from first use. Activated at any GVB gate. Skip the per-ride hassle and explore freely.'
WHERE slug = 'transit-day-pass';

UPDATE public.addons SET
  name = 'Amsterdam region transit pass',
  short_blurb = '24h pass covering Amsterdam metro, trams, buses, and the airport train.',
  description = 'Same as the day pass, but extended to the entire Amsterdam region — including the Schiphol airport train. Ideal if you want to explore beyond the city center or skip the Uber back to the airport.'
WHERE slug = 'transit-amsterdam-region';

UPDATE public.addons SET
  name = 'EU eSIM — 7 days, 5GB',
  short_blurb = '5GB of mobile data across the EU for 7 days. Activates instantly via QR code. €12.',
  description = 'Stay connected throughout your trip without paying roaming fees. We email you a QR code after booking — scan with your phone (most modern smartphones support eSIM), and you''re online in 60 seconds. 5GB of data, valid for 7 days, works in 30+ EU countries.'
WHERE slug = 'esim-eu-7day';

UPDATE public.addons SET
  name = 'EU eSIM — 30 days, 20GB',
  short_blurb = '20GB across the EU for 30 days. Best value for longer European trips. €29.',
  description = 'Going beyond Amsterdam? This 30-day, 20GB eSIM is the best value for travelers continuing through Europe. Same instant QR-code activation, same 30+ country coverage, four times more data than the 7-day plan.'
WHERE slug = 'esim-eu-30day';

UPDATE public.addons SET
  name = 'Luggage storage',
  short_blurb = 'Secure 24h luggage drop near Centraal, €8 per bag. Perfect for layover travelers.',
  description = 'Drop your bags at a secured Stasher partner location near Amsterdam Centraal — coffee shops, hotels, and shops vetted by Stasher. €8 per bag for up to 24 hours. Insured up to €1,000. Skip the airport locker queues.'
WHERE slug = 'luggage-storage';

UPDATE public.addons SET
  name = 'Skip-the-line: Rijksmuseum',
  short_blurb = 'Timed entry ticket to the Rijksmuseum, no queues. €25 per person.',
  description = 'Skip the entry queue at one of Europe''s most-visited museums. We book a timed entry slot aligned with your tour — usually mid-afternoon when crowds thin. Includes Dutch Masters, Vermeer, Rembrandt''s Night Watch, and the recently restored Cuypers building.'
WHERE slug = 'skip-line-rijksmuseum';

UPDATE public.addons SET
  name = 'Skip-the-line: Anne Frank House',
  short_blurb = 'Reserved entry to the Anne Frank House. Limited availability. €18 per person.',
  description = 'One of Amsterdam''s most meaningful sites and one of its hardest tickets. We reserve your timed entry slot up to 6 weeks in advance. Limited inventory — book early. The visit takes 60–90 minutes and pairs naturally with the Sprint or Classic tours.'
WHERE slug = 'skip-line-anne-frank';

UPDATE public.addons SET
  name = 'Stroopwafel pack',
  short_blurb = 'Take-home gift box of fresh stroopwafels from a real Amsterdam bakery. €12.',
  description = 'A 12-piece gift box of stroopwafels — Holland''s iconic syrup waffle — sourced from a small Amsterdam bakery, not a tourist stand. Vacuum-sealed for travel and gifting. The treat your kids actually remember.'
WHERE slug = 'stroopwafel-pack';

UPDATE public.addons SET
  name = '1-hour canal cruise',
  short_blurb = 'Classic 1-hour boat ride through Amsterdam''s UNESCO canals. €19 per person.',
  description = 'Add a relaxed 1-hour canal cruise to your tour day, scheduled to fit your itinerary. Covered glass-roof boat, multilingual audio guide, drinks available onboard. Operated by Stromma — the most trusted name on Amsterdam''s waterways.'
WHERE slug = 'canal-cruise-add';

-- ============================================================
-- Part 4 — Make name NOT NULL (after seeds)
-- ============================================================
ALTER TABLE public.addons
  ALTER COLUMN name SET NOT NULL;

COMMIT;

-- ============================================================
-- Sanity check
-- ============================================================
SELECT slug, name,
       LENGTH(short_blurb) AS blurb_len,
       LENGTH(description) AS desc_len
  FROM public.addons
 ORDER BY sort_order;
-- Expect 12 rows, no NULLs in name/short_blurb/description.
