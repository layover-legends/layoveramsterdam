-- =========================================================================
-- cities — multi-tenant anchor table.
--
-- Every entity (destinations, tours, articles, bookings, staff, partners…)
-- will carry a city_id FK to this table. Adding a new city to the platform
-- = one INSERT here + a content seed for that city. No code changes needed.
--
-- Run BEFORE multitenant-backfill.sql.
-- Idempotent: safe to re-run.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.cities (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  country_code     CHAR(2)     NOT NULL,                    -- ISO 3166-1 alpha-2
  timezone         TEXT        NOT NULL,                    -- IANA, e.g. Europe/Amsterdam
  default_locale   TEXT        NOT NULL DEFAULT 'en',
  currency         CHAR(3)     NOT NULL DEFAULT 'EUR',      -- ISO 4217
  center_lat       DOUBLE PRECISION,
  center_lng       DOUBLE PRECISION,
  airport_iata     CHAR(3),                                 -- AMS, CDG, DXB…
  airport_name     TEXT,
  pickup_lat       DOUBLE PRECISION,
  pickup_lng       DOUBLE PRECISION,
  pickup_instructions TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  launched_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_slug      ON public.cities (slug);
CREATE INDEX IF NOT EXISTS idx_cities_is_active ON public.cities (is_active);

-- updated_at trigger (reuses the shared helper if it exists).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_cities_updated_at ON public.cities;
    CREATE TRIGGER set_cities_updated_at
      BEFORE UPDATE ON public.cities
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS — public reads active cities; admins manage all.
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='cities'
       AND policyname='Public reads active cities'
  ) THEN
    CREATE POLICY "Public reads active cities" ON public.cities
      FOR SELECT USING (is_active = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='cities'
       AND policyname='Admins manage cities'
  ) THEN
    CREATE POLICY "Admins manage cities" ON public.cities
      FOR ALL
      USING  (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- ── Amsterdam seed ────────────────────────────────────────────────────────
-- The one city we operate in today. All existing destinations, tours, and
-- articles will be backfilled to reference this row in multitenant-backfill.sql.
INSERT INTO public.cities
  (slug, name, country_code, timezone, default_locale, currency,
   center_lat, center_lng, airport_iata, airport_name,
   pickup_lat, pickup_lng,
   is_active, launched_at)
VALUES
  ('amsterdam', 'Amsterdam', 'NL', 'Europe/Amsterdam', 'en', 'EUR',
   52.3676, 4.9041, 'AMS', 'Amsterdam Airport Schiphol',
   52.3105, 4.7683,   -- Schiphol Plaza pickup point
   TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Sanity check.
SELECT
  (SELECT COUNT(*) FROM public.cities)             AS city_count,
  (SELECT COUNT(*) FROM pg_policies
     WHERE schemaname='public' AND tablename='cities') AS policy_count,
  (SELECT slug FROM public.cities LIMIT 1)         AS first_city;
-- Expect: city_count=1, policy_count=2, first_city=amsterdam
