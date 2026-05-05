-- ── 9d4: SOS incidents + shop interest rate limits ───────────────────────────
--
-- 1. sos_incidents  — one row per driver SOS tap; tracks resolution lifecycle
-- 2. shop_interest_rate_limits — IP-based rate limit table for /api/shop/interest
--    (same schema as contact_rate_limits, separate table for independent counters)
--
-- Run in Supabase SQL Editor before deploying the 9d4 code changes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. sos_incidents ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sos_incidents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id            UUID        REFERENCES public.staff(id)    ON DELETE SET NULL,
  user_id             UUID        REFERENCES public.users(id)    ON DELETE SET NULL,
  booking_id          UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  assignment_id       UUID        REFERENCES public.assignments(id) ON DELETE SET NULL,
  latitude            NUMERIC(10,7),
  longitude           NUMERIC(10,7),
  accuracy_m          NUMERIC(8,2),
  ip_address          INET,
  user_agent          TEXT,
  resolved_at         TIMESTAMPTZ,
  resolved_by_user_id UUID        REFERENCES public.users(id)    ON DELETE SET NULL,
  resolution_notes    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_unresolved
  ON public.sos_incidents(created_at DESC) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sos_staff
  ON public.sos_incidents(staff_id, created_at DESC);

ALTER TABLE public.sos_incidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sos_incidents' AND policyname = 'sos_admin_all'
  ) THEN
    CREATE POLICY sos_admin_all ON public.sos_incidents
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sos_incidents' AND policyname = 'sos_self_insert'
  ) THEN
    CREATE POLICY sos_self_insert ON public.sos_incidents
      FOR INSERT
      WITH CHECK (
        staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sos_incidents' AND policyname = 'sos_self_read'
  ) THEN
    CREATE POLICY sos_self_read ON public.sos_incidents
      FOR SELECT
      USING (
        staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ── 2. shop_interest_rate_limits ──────────────────────────────────────────────
-- Mirrors contact_rate_limits schema; kept separate so the two endpoints have
-- independent 3-per-hour counters per IP.

CREATE TABLE IF NOT EXISTS public.shop_interest_rate_limits (
  ip_address   INET        PRIMARY KEY,
  count        INT         NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shop_interest_rate_limits ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — all writes go through the service-role (admin) client.

-- ── Verification ──────────────────────────────────────────────────────────────
SELECT 'sos_incidents'              AS tbl, count(*) FROM public.sos_incidents
UNION ALL
SELECT 'shop_interest_rate_limits'  AS tbl, count(*) FROM public.shop_interest_rate_limits;
