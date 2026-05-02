-- Phase 7d — Add-ons catalog + per-tour availability + booking line items
-- Locks the schema before Stripe price IDs are minted.
-- Idempotent: safe to re-run.
--
-- ⚠️  PRE-REQUISITE: drop Phase 7b's tour_addons + booking_addons tables
--     before running this. Phase 7b modeled add-ons as per-tour SKUs (84 rows
--     for 12 add-ons × 7 tours), which doesn't match Stripe's catalog model.
--     This phase replaces them with: addons (catalog) + tour_addons (join) +
--     booking_addons (line items). Run this first if those tables exist:
--
--     DROP TABLE IF EXISTS public.booking_addons CASCADE;
--     DROP TABLE IF EXISTS public.tour_addons    CASCADE;

BEGIN;

-- ============================================================
-- Part 1 — addons (master catalog, one row per Stripe SKU)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN
    ('mobility','connectivity','tickets','photo','food','comfort','souvenir','premium')),
  fulfillment TEXT NOT NULL CHECK (fulfillment IN
    ('digital','physical_pickup','partner_api','onboard','post_tour_delivery')),
  pricing_model TEXT NOT NULL CHECK (pricing_model IN
    ('flat','per_person','per_day','per_hour')),
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  vat_rate NUMERIC(4,3) NOT NULL DEFAULT 0.21,
  stripe_price_id TEXT,
  inventory_tracked BOOLEAN NOT NULL DEFAULT FALSE,
  stock_total INT,
  partner_id UUID,                              -- FK added later when partners table exists
  cogs_cents INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_addons_city_active
  ON public.addons(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_addons_category
  ON public.addons(category) WHERE is_active = TRUE;

-- Translations: addon name + description (polymorphic via existing translations table)
-- Field keys: 'name', 'description', 'short_blurb'

-- ============================================================
-- Part 2 — tour_addons (which add-ons are eligible per tour)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tour_addons (
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,   -- show in hero strip on tour page
  is_required BOOLEAN NOT NULL DEFAULT FALSE,      -- forced inclusion (rare)
  price_override_cents INT,                        -- bundle/discount
  sort_order INT DEFAULT 100,
  PRIMARY KEY (tour_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_addons_tour
  ON public.tour_addons(tour_id, sort_order);

-- ============================================================
-- Part 3 — booking_addons (immutable line items on a booking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id),
  qty INT NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price_cents INT NOT NULL,                   -- frozen at checkout
  vat_rate NUMERIC(4,3) NOT NULL,                  -- frozen at checkout
  fulfillment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN
      ('pending','reserved','delivered','failed','refunded')),
  fulfillment_payload JSONB,                       -- QR url, lock code, ticket PDF, etc.
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_booking
  ON public.booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_status
  ON public.booking_addons(fulfillment_status)
  WHERE fulfillment_status IN ('pending','reserved');

-- ============================================================
-- Part 4 — RLS
-- ============================================================

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- Public read: only active addons in active cities
DROP POLICY IF EXISTS addons_public_read ON public.addons;
CREATE POLICY addons_public_read ON public.addons
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS tour_addons_public_read ON public.tour_addons;
CREATE POLICY tour_addons_public_read ON public.tour_addons
  FOR SELECT USING (TRUE);

-- Booking add-ons: user can read their own, admin reads all
DROP POLICY IF EXISTS booking_addons_owner_read ON public.booking_addons;
CREATE POLICY booking_addons_owner_read ON public.booking_addons
  FOR SELECT USING (
    booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS booking_addons_admin_write ON public.booking_addons;
CREATE POLICY booking_addons_admin_write ON public.booking_addons
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS addons_admin_write ON public.addons;
CREATE POLICY addons_admin_write ON public.addons
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS tour_addons_admin_write ON public.tour_addons;
CREATE POLICY tour_addons_admin_write ON public.tour_addons
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- Part 5 — Seed launch catalog (12 SKUs, Amsterdam)
-- ============================================================

DO $$
DECLARE
  ams_id UUID;
BEGIN
  SELECT id INTO ams_id FROM public.cities WHERE slug = 'amsterdam' LIMIT 1;
  IF ams_id IS NULL THEN
    RAISE EXCEPTION 'Amsterdam city row missing — run multitenant-backfill.sql first';
  END IF;

  INSERT INTO public.addons
    (city_id, slug, category, fulfillment, pricing_model, price_cents, vat_rate,
     inventory_tracked, sort_order)
  VALUES
    (ams_id, 'photographer-upgrade',     'photo',        'onboard',             'flat',       4900, 0.21, FALSE, 10),
    (ams_id, 'ai-travelogue',            'souvenir',     'post_tour_delivery',  'flat',       1900, 0.21, FALSE, 20),
    (ams_id, 'bike-rental-day',          'mobility',     'physical_pickup',     'per_person', 1800, 0.21, TRUE,  30),
    (ams_id, 'transit-day-pass',         'tickets',      'partner_api',         'per_person',  900, 0.09, FALSE, 40),
    (ams_id, 'transit-amsterdam-region', 'tickets',      'partner_api',         'per_person', 1500, 0.09, FALSE, 50),
    (ams_id, 'esim-eu-7day',             'connectivity', 'digital',             'flat',       1200, 0.21, FALSE, 60),
    (ams_id, 'esim-eu-30day',            'connectivity', 'digital',             'flat',       2900, 0.21, FALSE, 70),
    (ams_id, 'luggage-storage',          'comfort',      'physical_pickup',     'flat',        800, 0.21, FALSE, 80),
    (ams_id, 'skip-line-rijksmuseum',    'tickets',      'partner_api',         'per_person', 2500, 0.09, TRUE,  90),
    (ams_id, 'skip-line-anne-frank',     'tickets',      'partner_api',         'per_person', 1800, 0.09, TRUE, 100),
    (ams_id, 'stroopwafel-pack',         'food',         'onboard',             'flat',       1200, 0.09, FALSE,110),
    (ams_id, 'canal-cruise-add',         'premium',      'partner_api',         'per_person', 1900, 0.09, FALSE,120)
  ON CONFLICT (city_id, slug) DO NOTHING;
END $$;

-- ============================================================
-- Part 6 — Seed tour_addons (which add-ons surface where)
-- ============================================================
-- Conventions:
--   Hero strip on tour page = is_recommended = TRUE (max 3 per tour)
--   Full catalog in booking step = all rows below

DO $$
DECLARE
  t_sprint UUID; t_classic UUID; t_group UUID; t_private UUID;
  t_after  UUID; t_transit UUID; t_ai UUID;
  ams_id UUID;
  a_record RECORD;
BEGIN
  SELECT id INTO ams_id FROM public.cities WHERE slug = 'amsterdam';
  SELECT id INTO t_sprint  FROM public.tours WHERE slug = 'sprint';
  SELECT id INTO t_classic FROM public.tours WHERE slug = 'classic';
  SELECT id INTO t_group   FROM public.tours WHERE slug = 'group';
  SELECT id INTO t_private FROM public.tours WHERE slug = 'private';
  SELECT id INTO t_after   FROM public.tours WHERE slug = 'after-dark';
  SELECT id INTO t_transit FROM public.tours WHERE slug = 'transit-classic';
  SELECT id INTO t_ai      FROM public.tours WHERE slug = 'ai-sprint';

  -- Helper: every active tour gets every active add-on by default,
  -- except photographer-upgrade is excluded from public_transit tours
  -- (no van = no roving photographer setup).
  FOR a_record IN
    SELECT id, slug FROM public.addons WHERE city_id = ams_id AND is_active
  LOOP
    IF t_sprint IS NOT NULL THEN
      INSERT INTO public.tour_addons (tour_id, addon_id) VALUES (t_sprint, a_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
    IF t_classic IS NOT NULL THEN
      INSERT INTO public.tour_addons (tour_id, addon_id) VALUES (t_classic, a_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
    IF t_group IS NOT NULL THEN
      INSERT INTO public.tour_addons (tour_id, addon_id) VALUES (t_group, a_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
    IF t_private IS NOT NULL THEN
      INSERT INTO public.tour_addons (tour_id, addon_id) VALUES (t_private, a_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
    IF t_after IS NOT NULL THEN
      INSERT INTO public.tour_addons (tour_id, addon_id) VALUES (t_after, a_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
    IF t_transit IS NOT NULL AND a_record.slug != 'photographer-upgrade' THEN
      INSERT INTO public.tour_addons (tour_id, addon_id) VALUES (t_transit, a_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
    IF t_ai IS NOT NULL AND a_record.slug != 'photographer-upgrade' THEN
      INSERT INTO public.tour_addons (tour_id, addon_id) VALUES (t_ai, a_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Hero recommendations: 3 per tour
  -- Sprint, Classic, Private, After Dark = photographer + esim-7day + transit-day-pass
  UPDATE public.tour_addons SET is_recommended = TRUE
   WHERE tour_id IN (t_sprint, t_classic, t_private, t_after)
     AND addon_id IN (SELECT id FROM public.addons WHERE slug IN
       ('photographer-upgrade','esim-eu-7day','transit-day-pass'));

  -- Group = stroopwafel + esim-7day + canal-cruise (cheaper, friendlier)
  UPDATE public.tour_addons SET is_recommended = TRUE
   WHERE tour_id = t_group
     AND addon_id IN (SELECT id FROM public.addons WHERE slug IN
       ('stroopwafel-pack','esim-eu-7day','canal-cruise-add'));

  -- Transit & AI tours = bike + esim + ai-travelogue
  UPDATE public.tour_addons SET is_recommended = TRUE
   WHERE tour_id IN (t_transit, t_ai)
     AND addon_id IN (SELECT id FROM public.addons WHERE slug IN
       ('bike-rental-day','esim-eu-7day','ai-travelogue'));
END $$;

-- ============================================================
-- Part 7 — updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS addons_set_updated_at ON public.addons;
CREATE TRIGGER addons_set_updated_at
  BEFORE UPDATE ON public.addons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- ============================================================
-- Sanity check
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM public.addons)               AS total_addons,
  (SELECT COUNT(*) FROM public.addons WHERE is_active) AS active_addons,
  (SELECT COUNT(*) FROM public.tour_addons)          AS tour_addon_links,
  (SELECT COUNT(*) FROM public.tour_addons WHERE is_recommended) AS hero_addons;
-- Expect: 12, 12, 7×12 - 2 (photographer excluded from transit + ai) = 82, 21
