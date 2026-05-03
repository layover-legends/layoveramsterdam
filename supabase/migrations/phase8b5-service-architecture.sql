-- Phase 8b.5 — Service architecture: standalones, /shop, coming-soon waitlist
-- Idempotent: safe to re-run.
-- Run in Supabase SQL Editor BEFORE deploying the UI code.

BEGIN;

-- ============================================================
-- Part 1 — Extend addons table with classification columns
-- ============================================================

ALTER TABLE public.addons
  ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'addon'
    CHECK (service_type IN ('addon','standalone','both')),
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'active'
    CHECK (availability_status IN ('active','coming_soon','inactive')),
  ADD COLUMN IF NOT EXISTS cogs_cents INT;

-- ============================================================
-- Part 2 — Reclassify existing 12 add-ons
-- ============================================================

-- Pure add-ons: sold only inside tour booking flow
UPDATE public.addons
   SET service_type = 'addon', availability_status = 'active'
 WHERE slug IN ('photographer-upgrade', 'ai-travelogue', 'stroopwafel-pack');

-- Standalones with partner dependency → coming_soon until contracts signed
UPDATE public.addons
   SET service_type = 'standalone', availability_status = 'coming_soon'
 WHERE slug IN (
   'esim-eu-7day', 'esim-eu-30day', 'bike-rental-day',
   'transit-day-pass', 'transit-amsterdam-region', 'luggage-storage',
   'skip-line-rijksmuseum', 'skip-line-anne-frank', 'canal-cruise-add'
 );

-- ============================================================
-- Part 3 — COGS estimates (cents) for live margin calculation
-- ============================================================

UPDATE public.addons SET cogs_cents = 100  WHERE slug = 'photographer-upgrade';
UPDATE public.addons SET cogs_cents = 1000 WHERE slug = 'ai-travelogue';
UPDATE public.addons SET cogs_cents = 500  WHERE slug = 'stroopwafel-pack';
UPDATE public.addons SET cogs_cents = 700  WHERE slug = 'esim-eu-7day';
UPDATE public.addons SET cogs_cents = 1800 WHERE slug = 'esim-eu-30day';
UPDATE public.addons SET cogs_cents = 1100 WHERE slug = 'bike-rental-day';
UPDATE public.addons SET cogs_cents = 900  WHERE slug = 'transit-day-pass';
UPDATE public.addons SET cogs_cents = 1400 WHERE slug = 'transit-amsterdam-region';
UPDATE public.addons SET cogs_cents = 500  WHERE slug = 'luggage-storage';
UPDATE public.addons SET cogs_cents = 2000 WHERE slug = 'skip-line-rijksmuseum';
UPDATE public.addons SET cogs_cents = 1600 WHERE slug = 'skip-line-anne-frank';
UPDATE public.addons SET cogs_cents = 1300 WHERE slug = 'canal-cruise-add';

-- ============================================================
-- Part 4 — Insert 3 new standalone services (active at launch)
-- ============================================================

DO $$
DECLARE
  ams_id UUID;
BEGIN
  SELECT id INTO ams_id FROM public.cities WHERE slug = 'amsterdam' LIMIT 1;
  IF ams_id IS NULL THEN
    RAISE EXCEPTION 'Amsterdam city row missing — run multitenant-backfill.sql first';
  END IF;

  INSERT INTO public.addons (
    city_id, slug, name, short_blurb, description,
    category, fulfillment, pricing_model, price_cents, vat_rate,
    cogs_cents, service_type, availability_status, is_active, sort_order
  ) VALUES
    (ams_id, 'ai-audio-walk',
     'AI audio walk — Amsterdam highlights',
     'Self-guided audio tour. Voice in your ear, walk at your own pace. €15.',
     'Eight Amsterdam highlights, narrated in your headphones via our companion app. Walk at your own pace, take your own time at each stop. The AI knows the city and adapts to your interests. Pick a voice — warm local, dry historian, or witty Brit. Works offline once downloaded.',
     'connectivity', 'digital', 'flat', 1500, 0.21, 60,
     'standalone', 'active', TRUE, 5),

    (ams_id, 'photoshoot-1h',
     'Photographer — 1 hour',
     'Pro photographer for 1h at Amsterdam''s most photogenic spots. €99.',
     'Solo, couple, or family photoshoot at iconic Amsterdam locations — canals, Jordaan, Vondelpark, your pick. 1 hour of shooting, 30+ professionally edited photos delivered within 48h via private gallery. Perfect for engagements, anniversaries, or just because.',
     'photo', 'physical_pickup', 'flat', 9900, 0.21, 0,
     'standalone', 'active', TRUE, 6),

    (ams_id, 'photoshoot-3h',
     'Photographer — 3 hours',
     'Half-day photoshoot, multiple Amsterdam locations. €229.',
     'Three hours, multiple locations, full storytelling shoot. 80+ edited photos, optional canal-side outfit change, vintage tram or bike props on request. Best value for couples, families, or content creators.',
     'photo', 'physical_pickup', 'flat', 22900, 0.21, 0,
     'standalone', 'active', TRUE, 7)
  ON CONFLICT (city_id, slug) DO UPDATE SET
    name                = EXCLUDED.name,
    short_blurb         = EXCLUDED.short_blurb,
    description         = EXCLUDED.description,
    price_cents         = EXCLUDED.price_cents,
    cogs_cents          = EXCLUDED.cogs_cents,
    service_type        = EXCLUDED.service_type,
    availability_status = EXCLUDED.availability_status;
END $$;

-- ============================================================
-- Part 5 — Update Group tour price (€49 → €59)
-- ============================================================

UPDATE public.tours
   SET price_cents = 5900
 WHERE slug = 'group';

-- Mark group tour translations stale for DeepL re-run
UPDATE public.translations
   SET is_stale = TRUE
 WHERE entity_type = 'tour'
   AND entity_id = (SELECT id FROM public.tours WHERE slug = 'group')
   AND language != 'en';

-- ============================================================
-- Part 6 — Make bookings.tour_id nullable
-- (standalone purchases don't require a tour)
-- ============================================================

ALTER TABLE public.bookings
  ALTER COLUMN tour_id DROP NOT NULL;

-- ============================================================
-- Part 7 — service_interest (email waitlist for coming-soon)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_interest (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  locale      TEXT,
  city_id     UUID REFERENCES public.cities(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  UNIQUE (service_id, email)
);

CREATE INDEX IF NOT EXISTS idx_service_interest_service
  ON public.service_interest(service_id);
CREATE INDEX IF NOT EXISTS idx_service_interest_email
  ON public.service_interest(email);

ALTER TABLE public.service_interest ENABLE ROW LEVEL SECURITY;

-- Anyone can register interest (anonymous-friendly)
DROP POLICY IF EXISTS interest_public_insert ON public.service_interest;
CREATE POLICY interest_public_insert ON public.service_interest
  FOR INSERT WITH CHECK (TRUE);

-- Admin reads all
DROP POLICY IF EXISTS interest_admin_read ON public.service_interest;
CREATE POLICY interest_admin_read ON public.service_interest
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS interest_admin_write ON public.service_interest;
CREATE POLICY interest_admin_write ON public.service_interest
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

COMMIT;

-- ============================================================
-- Sanity check
-- ============================================================
SELECT
  service_type,
  availability_status,
  COUNT(*) AS count
FROM public.addons
GROUP BY service_type, availability_status
ORDER BY service_type, availability_status;
-- Expected:
--   addon      | active       | 3
--   standalone | active       | 3
--   standalone | coming_soon  | 9
