-- Phase 9c — Operations Command Center
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- Apply this before generating TypeScript types or building the UI.

-- ── 1. staff — augment existing scaffold ─────────────────────────────────────
-- Existing columns from booking-primitives.sql:
--   id, user_id, city_id, role, status, certified_at, hourly_cents, notes,
--   created_at, updated_at
-- We expand role values and add all operational fields.

-- 1a. Widen the role CHECK constraint to include Phase 9c values
--     (legacy values kept so any existing rows don't break)
DO $$
DECLARE v_conname TEXT;
BEGIN
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'staff'
    AND c.contype = 'c' AND (c.conname LIKE '%role%' OR pg_get_constraintdef(c.oid) LIKE '%role%');
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.staff DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END $$;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check CHECK (role IN (
    'driver_only', 'guide_only', 'driver_guide', 'photographer', 'support', 'manager', 'owner',
    'guide', 'driver', 'dispatcher', 'admin'
  ));

-- 1b. Operational columns
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS full_name              TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_name         TEXT,
  ADD COLUMN IF NOT EXISTS photo_url              TEXT,
  ADD COLUMN IF NOT EXISTS bio_short              TEXT,
  ADD COLUMN IF NOT EXISTS bio_long               TEXT,
  ADD COLUMN IF NOT EXISTS phone                  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS hire_date              DATE,
  ADD COLUMN IF NOT EXISTS termination_date       DATE,
  -- hourly_cents exists as legacy name; add canonical rate columns
  ADD COLUMN IF NOT EXISTS hourly_rate_cents      INT,
  ADD COLUMN IF NOT EXISTS daily_rate_cents       INT,
  ADD COLUMN IF NOT EXISTS payout_method          TEXT
    CHECK (payout_method IS NULL OR payout_method IN ('bank_transfer', 'cash', 'platform')),
  ADD COLUMN IF NOT EXISTS bank_iban              TEXT,
  ADD COLUMN IF NOT EXISTS spoken_languages       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS driving_license_number TEXT,
  ADD COLUMN IF NOT EXISTS driving_license_expiry DATE,
  ADD COLUMN IF NOT EXISTS taxi_pas_number        TEXT,
  ADD COLUMN IF NOT EXISTS taxi_pas_expiry        DATE,
  ADD COLUMN IF NOT EXISTS first_aid_cert_expiry  DATE,
  ADD COLUMN IF NOT EXISTS background_check_date  DATE,
  ADD COLUMN IF NOT EXISTS background_check_expiry DATE,
  ADD COLUMN IF NOT EXISTS is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_tours_per_day      INT NOT NULL DEFAULT 3;

-- 1c. Performance indexes
CREATE INDEX IF NOT EXISTS idx_staff_active
  ON public.staff(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_staff_role
  ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_license_expiry
  ON public.staff(driving_license_expiry) WHERE driving_license_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_taxi_pas_expiry
  ON public.staff(taxi_pas_expiry) WHERE taxi_pas_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_first_aid_expiry
  ON public.staff(first_aid_cert_expiry) WHERE first_aid_cert_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_bg_check_expiry
  ON public.staff(background_check_expiry) WHERE background_check_expiry IS NOT NULL;

-- ── 2. vehicles — CREATE (does not exist yet) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicles (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname                TEXT        NOT NULL DEFAULT '',
  vehicle_type            TEXT        NOT NULL DEFAULT 'van'
    CHECK (vehicle_type IN ('van', 'minivan', 'bus', 'sedan', 'bike',
                            'electric_bike', 'scooter', 'tram_pass', 'other')),
  make                    TEXT,
  model                   TEXT,
  year                    INT,
  license_plate           TEXT,
  vin                     TEXT,
  color                   TEXT,
  seats                   INT,
  wheelchair_accessible   BOOLEAN     DEFAULT FALSE,
  purchase_date           DATE,
  purchase_price_cents    INT,
  odometer_km             INT,
  apk_expiry              DATE,
  insurance_expiry        DATE,
  insurance_policy_number TEXT,
  road_tax_expiry         DATE,
  last_service_date       DATE,
  last_service_km         INT,
  service_interval_km     INT         NOT NULL DEFAULT 15000,
  fuel_type               TEXT
    CHECK (fuel_type IS NULL OR fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'na')),
  fuel_card_number        TEXT,
  notes                   TEXT,
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_active
  ON public.vehicles(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_vehicles_apk
  ON public.vehicles(apk_expiry) WHERE apk_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_insurance
  ON public.vehicles(insurance_expiry) WHERE insurance_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_road_tax
  ON public.vehicles(road_tax_expiry) WHERE road_tax_expiry IS NOT NULL;

-- ── 3. assignments — CREATE (does not exist yet) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.assignments (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                UUID        REFERENCES public.bookings(id) ON DELETE CASCADE,
  staff_id                  UUID        REFERENCES public.staff(id) ON DELETE SET NULL,
  vehicle_id                UUID        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  role_on_tour              TEXT
    CHECK (role_on_tour IS NULL OR role_on_tour IN
           ('driver', 'guide', 'photographer', 'driver_guide', 'support')),
  pickup_at                 TIMESTAMPTZ,
  dropoff_at                TIMESTAMPTZ,
  preflight_done_at         TIMESTAMPTZ,
  preflight_checklist       JSONB,
  started_at                TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  no_show_at                TIMESTAMPTZ,
  no_show_reason            TEXT,
  odometer_start            INT,
  odometer_end              INT,
  fuel_cost_cents           INT,
  guide_notes_on_customer   TEXT,
  internal_notes            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_booking
  ON public.assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_assignments_staff_pickup
  ON public.assignments(staff_id, pickup_at);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle_pickup
  ON public.assignments(vehicle_id, pickup_at);
-- Fast date-range queries for the roster page
CREATE INDEX IF NOT EXISTS idx_assignments_pickup_date
  ON public.assignments(pickup_at);

-- ── 4. tip_payments — CREATE (does not exist yet) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.tip_payments (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID        REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount_cents            INT         NOT NULL DEFAULT 0,
  currency                CHAR(3)     NOT NULL DEFAULT 'EUR',
  recipient_staff_id      UUID        REFERENCES public.staff(id) ON DELETE SET NULL,
  payment_method          TEXT
    CHECK (payment_method IS NULL OR payment_method IN
           ('cash', 'stripe', 'platform_credit', 'other')),
  stripe_payment_intent_id TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tip_payments_booking
  ON public.tip_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_tip_payments_recipient
  ON public.tip_payments(recipient_staff_id, created_at DESC);

-- ── 5. push_subscriptions — CREATE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint      TEXT        NOT NULL UNIQUE,
  p256dh_key    TEXT        NOT NULL,
  auth_key      TEXT        NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user
  ON public.push_subscriptions(user_id);

-- ── 6. Customer notes + VIP on users ─────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS internal_notes          TEXT,
  ADD COLUMN IF NOT EXISTS is_vip                  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lifetime_bookings_count INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_revenue_cents  BIGINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dietary_notes           TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_notes     TEXT;

-- ── 7. Cancellation taxonomy — bookings ──────────────────────────────────────
-- cancellation_reason column already exists (TEXT, no CHECK) — add constraint
-- and companion columns.
DO $$
DECLARE v_conname TEXT;
BEGIN
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'bookings'
    AND c.contype = 'c' AND pg_get_constraintdef(c.oid) LIKE '%cancellation_reason%';
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancellation_reason_check
  CHECK (cancellation_reason IS NULL OR cancellation_reason IN (
    'customer_changed_mind', 'customer_flight_cancelled', 'customer_flight_delayed',
    'customer_emergency', 'customer_double_booked', 'customer_price_complaint',
    'operator_overbooked', 'operator_vehicle_breakdown', 'operator_staff_sick',
    'operator_weather', 'payment_failed', 'fraud_suspected', 'other'
  ));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_notes     TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- ── 8. RLS policies ───────────────────────────────────────────────────────────
ALTER TABLE public.staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='staff' AND policyname='staff_admin_all') THEN
    CREATE POLICY staff_admin_all ON public.staff
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='staff' AND policyname='staff_self_read') THEN
    CREATE POLICY staff_self_read ON public.staff
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' AND policyname='vehicles_admin_all') THEN
    CREATE POLICY vehicles_admin_all ON public.vehicles
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignments' AND policyname='assignments_admin_all') THEN
    CREATE POLICY assignments_admin_all ON public.assignments
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignments' AND policyname='assignments_self_read') THEN
    CREATE POLICY assignments_self_read ON public.assignments
      FOR SELECT USING (
        staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      );
  END IF;
  -- Drivers can update their OWN assignment (mark started/completed/preflight)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignments' AND policyname='assignments_self_write') THEN
    CREATE POLICY assignments_self_write ON public.assignments
      FOR UPDATE USING (
        staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      ) WITH CHECK (
        staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tip_payments' AND policyname='tip_payments_admin_all') THEN
    CREATE POLICY tip_payments_admin_all ON public.tip_payments
      FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tip_payments' AND policyname='tip_payments_recipient_read') THEN
    CREATE POLICY tip_payments_recipient_read ON public.tip_payments
      FOR SELECT USING (
        recipient_staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_subscriptions' AND policyname='push_subs_self') THEN
    CREATE POLICY push_subs_self ON public.push_subscriptions
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 9. Customer lifetime stats — backfill + trigger ───────────────────────────
UPDATE public.users u SET
  lifetime_bookings_count = COALESCE((
    SELECT COUNT(*) FROM public.bookings
    WHERE user_id = u.id AND status IN ('paid','confirmed','in_progress','completed')
  ), 0),
  lifetime_revenue_cents = COALESCE((
    SELECT SUM(total_cents) FROM public.bookings
    WHERE user_id = u.id AND status IN ('paid','confirmed','in_progress','completed')
  ), 0);

CREATE OR REPLACE FUNCTION public.update_user_lifetime_stats()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.users SET
    lifetime_bookings_count = (
      SELECT COUNT(*) FROM public.bookings
      WHERE user_id = NEW.user_id AND status IN ('paid','confirmed','in_progress','completed')
    ),
    lifetime_revenue_cents = COALESCE((
      SELECT SUM(total_cents) FROM public.bookings
      WHERE user_id = NEW.user_id AND status IN ('paid','confirmed','in_progress','completed')
    ), 0)
  WHERE id = NEW.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_user_lifetime_stats ON public.bookings;
CREATE TRIGGER trg_user_lifetime_stats
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_lifetime_stats();

-- ── 10. Founder staff seed — INTENTIONALLY NOT INCLUDED ──────────────────────
-- Steven adds himself via the new /admin/staff "+ Add staff" UI on first deploy.
-- This validates the entire create flow end-to-end (form → RLS → DB) before any
-- real driver is added. If the UI can't seat the owner, it is not ready for staff.

-- ── 11. Sanity-check SELECTs ──────────────────────────────────────────────────
SELECT 'staff'               AS tbl, COUNT(*) FROM public.staff;
SELECT 'vehicles'            AS tbl, COUNT(*) FROM public.vehicles;
SELECT 'assignments'         AS tbl, COUNT(*) FROM public.assignments;
SELECT 'tip_payments'        AS tbl, COUNT(*) FROM public.tip_payments;
SELECT 'push_subscriptions'  AS tbl, COUNT(*) FROM public.push_subscriptions;
SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'staff'
    AND column_name IN ('full_name','driving_license_expiry','max_tours_per_day','is_active')
  ORDER BY column_name;
SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name IN ('is_vip','lifetime_bookings_count','lifetime_revenue_cents','internal_notes')
  ORDER BY column_name;
