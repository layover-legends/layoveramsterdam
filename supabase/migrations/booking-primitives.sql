-- =========================================================================
-- Booking primitives — Phase 7b
--
-- New tables: tour_addons, layovers, bookings, booking_addons, reviews,
--             staff, partners, booking_referrals, booking_staff,
--             souvenirs (Blueprint+ A1), analytics_events (Blueprint+ A3).
--
-- NOTE: public.tour_stops already exists (created in tours-setup.sql /
--       tours-align.sql). Columns: id, tour_id, destination_id, stop_order,
--       is_optional, duration_override, notes, created_at.
--
-- Run once in Supabase SQL Editor. Idempotent: safe to re-run.
-- Depends on: admin-setup.sql (is_admin fn), cities.sql, tours-setup.sql.
-- =========================================================================

-- ── Tour add-ons ──────────────────────────────────────────────────────────
-- Optional extras a user can attach to a booking (museum entry, tasting, etc.)

CREATE TABLE IF NOT EXISTS public.tour_addons (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id     UUID    NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency    CHAR(3) NOT NULL DEFAULT 'EUR',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_addons_tour_id ON public.tour_addons (tour_id);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_tour_addons_updated_at ON public.tour_addons;
    CREATE TRIGGER set_tour_addons_updated_at
      BEFORE UPDATE ON public.tour_addons
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.tour_addons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tour_addons' AND policyname='Public reads active tour_addons') THEN
    CREATE POLICY "Public reads active tour_addons" ON public.tour_addons FOR SELECT USING (is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tour_addons' AND policyname='Admins manage tour_addons') THEN
    CREATE POLICY "Admins manage tour_addons" ON public.tour_addons FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Layovers ─────────────────────────────────────────────────────────────
-- Entry funnel. User submits flight in/out + terminal → we suggest tours.

CREATE TABLE IF NOT EXISTS public.layovers (
  id                 UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID     REFERENCES public.users(id) ON DELETE SET NULL,
  city_id            UUID     NOT NULL REFERENCES public.cities(id),
  flight_in_at       TIMESTAMPTZ NOT NULL,
  flight_out_at      TIMESTAMPTZ NOT NULL,
  arrival_terminal   TEXT,
  departure_terminal TEXT,
  arrival_flight     TEXT,
  departure_flight   TEXT,
  party_size         SMALLINT NOT NULL DEFAULT 1 CHECK (party_size BETWEEN 1 AND 12),
  has_checked_bags   BOOLEAN  NOT NULL DEFAULT FALSE,
  notes              TEXT,
  status             TEXT     NOT NULL DEFAULT 'submitted'
                       CHECK (status IN ('submitted','matched','converted','expired','cancelled')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (flight_out_at > flight_in_at)
);

CREATE INDEX IF NOT EXISTS idx_layovers_user_id    ON public.layovers (user_id);
CREATE INDEX IF NOT EXISTS idx_layovers_city_id    ON public.layovers (city_id);
CREATE INDEX IF NOT EXISTS idx_layovers_status     ON public.layovers (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_layovers_created_at ON public.layovers (created_at DESC);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_layovers_updated_at ON public.layovers;
    CREATE TRIGGER set_layovers_updated_at
      BEFORE UPDATE ON public.layovers
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.layovers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='layovers' AND policyname='Users read own layovers') THEN
    CREATE POLICY "Users read own layovers" ON public.layovers FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='layovers' AND policyname='Users insert layovers') THEN
    CREATE POLICY "Users insert layovers" ON public.layovers FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='layovers' AND policyname='Admins manage layovers') THEN
    CREATE POLICY "Admins manage layovers" ON public.layovers FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Bookings ──────────────────────────────────────────────────────────────
-- The revenue mechanism.

CREATE TABLE IF NOT EXISTS public.bookings (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  city_id              UUID    NOT NULL REFERENCES public.cities(id),
  tour_id              UUID    NOT NULL REFERENCES public.tours(id),
  layover_id           UUID    REFERENCES public.layovers(id) ON DELETE SET NULL,
  party_size           SMALLINT NOT NULL DEFAULT 1,
  scheduled_pickup_at  TIMESTAMPTZ NOT NULL,
  scheduled_dropoff_at TIMESTAMPTZ NOT NULL,
  base_cents           INTEGER NOT NULL,
  addons_cents         INTEGER NOT NULL DEFAULT 0,
  total_cents          INTEGER NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'EUR',
  status               TEXT    NOT NULL DEFAULT 'pending_payment'
                         CHECK (status IN ('pending_payment','confirmed','in_progress','completed','cancelled','refunded','no_show')),
  payment_intent_id    TEXT,
  cancellation_reason  TEXT,
  cancelled_at         TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scheduled_dropoff_at > scheduled_pickup_at),
  CHECK (total_cents = base_cents + addons_cents)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_city_id    ON public.bookings (city_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_id    ON public.bookings (tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_layover_id ON public.bookings (layover_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON public.bookings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
    CREATE TRIGGER set_bookings_updated_at
      BEFORE UPDATE ON public.bookings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='Users read own bookings') THEN
    CREATE POLICY "Users read own bookings" ON public.bookings FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='Users update own bookings') THEN
    CREATE POLICY "Users update own bookings" ON public.bookings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='Admins manage bookings') THEN
    CREATE POLICY "Admins manage bookings" ON public.bookings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Booking add-ons ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.booking_addons (
  booking_id UUID    NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id   UUID    NOT NULL REFERENCES public.tour_addons(id) ON DELETE RESTRICT,
  qty        SMALLINT NOT NULL DEFAULT 1,
  unit_cents INTEGER NOT NULL,
  PRIMARY KEY (booking_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_booking_id ON public.booking_addons (booking_id);

ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='booking_addons' AND policyname='Users read own booking_addons') THEN
    CREATE POLICY "Users read own booking_addons" ON public.booking_addons
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='booking_addons' AND policyname='Admins manage booking_addons') THEN
    CREATE POLICY "Admins manage booking_addons" ON public.booking_addons FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Reviews ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID     NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body         TEXT,
  is_published BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews (booking_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Public reads published reviews') THEN
    CREATE POLICY "Public reads published reviews" ON public.reviews FOR SELECT USING (is_published = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Admins manage reviews') THEN
    CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Staff ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  city_id      UUID NOT NULL REFERENCES public.cities(id),
  role         TEXT NOT NULL CHECK (role IN ('guide','driver','dispatcher','support','manager','admin')),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','onboarding')),
  certified_at TIMESTAMPTZ,
  hourly_cents INTEGER,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_city_id ON public.staff (city_id);
CREATE INDEX IF NOT EXISTS idx_staff_role    ON public.staff (role);
CREATE INDEX IF NOT EXISTS idx_staff_status  ON public.staff (status);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_staff_updated_at ON public.staff;
    CREATE TRIGGER set_staff_updated_at
      BEFORE UPDATE ON public.staff
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='staff' AND policyname='Admins manage staff') THEN
    CREATE POLICY "Admins manage staff" ON public.staff FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Partners ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partners (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id        UUID    NOT NULL REFERENCES public.cities(id),
  slug           TEXT    NOT NULL UNIQUE,
  name           TEXT    NOT NULL,
  type           TEXT    NOT NULL CHECK (type IN ('hotel','lounge','agency','airline','other')),
  contact_email  TEXT,
  commission_bps SMALLINT NOT NULL DEFAULT 1000 CHECK (commission_bps BETWEEN 0 AND 5000),
  status         TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_city_id ON public.partners (city_id);
CREATE INDEX IF NOT EXISTS idx_partners_status  ON public.partners (status);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_partners_updated_at ON public.partners;
    CREATE TRIGGER set_partners_updated_at
      BEFORE UPDATE ON public.partners
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='partners' AND policyname='Admins manage partners') THEN
    CREATE POLICY "Admins manage partners" ON public.partners FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Booking referrals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.booking_referrals (
  booking_id       UUID    PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id       UUID    NOT NULL REFERENCES public.partners(id),
  commission_cents INTEGER NOT NULL DEFAULT 0,
  paid_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_booking_referrals_partner_id ON public.booking_referrals (partner_id);

ALTER TABLE public.booking_referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='booking_referrals' AND policyname='Admins manage booking_referrals') THEN
    CREATE POLICY "Admins manage booking_referrals" ON public.booking_referrals FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Booking staff ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.booking_staff (
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  staff_id   UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  role       TEXT NOT NULL CHECK (role IN ('guide','driver')),
  PRIMARY KEY (booking_id, role)
);

CREATE INDEX IF NOT EXISTS idx_booking_staff_staff_id ON public.booking_staff (staff_id);

ALTER TABLE public.booking_staff ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='booking_staff' AND policyname='Admins manage booking_staff') THEN
    CREATE POLICY "Admins manage booking_staff" ON public.booking_staff FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Souvenirs — Blueprint+ A1 ─────────────────────────────────────────────
-- First-class entity (not a file). Unlocks AI travelogue (M1) and live
-- streaming (M2) at zero extra cost. PDF + ai_text nullable until Phase 10.

CREATE TABLE IF NOT EXISTS public.souvenirs (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID    NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  gps_trace        JSONB   NOT NULL DEFAULT '[]',
  photo_refs       TEXT[]  NOT NULL DEFAULT '{}',
  audio_ref        TEXT,
  ai_text          TEXT,
  weather_at_time  JSONB,
  pdf_url          TEXT,
  shared_link_slug TEXT    UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_souvenirs_booking_id ON public.souvenirs (booking_id);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_souvenirs_updated_at ON public.souvenirs;
    CREATE TRIGGER set_souvenirs_updated_at
      BEFORE UPDATE ON public.souvenirs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.souvenirs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='souvenirs' AND policyname='Users read own souvenirs') THEN
    CREATE POLICY "Users read own souvenirs" ON public.souvenirs
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='souvenirs' AND policyname='Admins manage souvenirs') THEN
    CREATE POLICY "Admins manage souvenirs" ON public.souvenirs FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Analytics events — Blueprint+ A3 ─────────────────────────────────────
-- Rich event log for every funnel action. admin-read-only; inserts via
-- service role from server actions only — no client-side DB access.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id UUID,
  event_name TEXT NOT NULL,
  props      JSONB NOT NULL DEFAULT '{}',
  url        TEXT,
  referrer   TEXT,
  user_agent TEXT,
  ip_country CHAR(2),
  locale     TEXT,
  city_id    UUID REFERENCES public.cities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_name_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_id_created    ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at         ON public.analytics_events (created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analytics_events' AND policyname='Admins read analytics_events') THEN
    CREATE POLICY "Admins read analytics_events" ON public.analytics_events FOR SELECT USING (public.is_admin(auth.uid()));
  END IF;
END $$;


-- ── Sanity check ──────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.tour_addons)       AS tour_addons,
  (SELECT COUNT(*) FROM public.layovers)          AS layovers,
  (SELECT COUNT(*) FROM public.bookings)          AS bookings,
  (SELECT COUNT(*) FROM public.booking_addons)    AS booking_addons,
  (SELECT COUNT(*) FROM public.reviews)           AS reviews,
  (SELECT COUNT(*) FROM public.staff)             AS staff,
  (SELECT COUNT(*) FROM public.partners)          AS partners,
  (SELECT COUNT(*) FROM public.booking_referrals) AS booking_referrals,
  (SELECT COUNT(*) FROM public.booking_staff)     AS booking_staff,
  (SELECT COUNT(*) FROM public.souvenirs)         AS souvenirs,
  (SELECT COUNT(*) FROM public.analytics_events)  AS analytics_events;
