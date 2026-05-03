-- ============================================================
-- Phase 9a — Security Hardening
-- Run in Supabase SQL Editor. Idempotent: safe to re-run.
-- ============================================================

-- ── SEC-06: Fix custom_routes SELECT policy ───────────────────────────────
--
-- The original "routes_owner_or_share_read" policy had a clause
-- `share_slug IS NOT NULL` which let any authenticated user read ALL shared
-- routes in a single query without knowing the slug — a full-table data leak.
--
-- Fix: remove that clause. Owner + admin reads are sufficient.
-- Shared-route lookups are now the responsibility of a server-side API route
-- (or a SECURITY DEFINER function) that validates the caller-supplied slug
-- before returning the row. The app must NOT rely on RLS alone for share access.

DROP POLICY IF EXISTS routes_owner_or_share_read ON public.custom_routes;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_routes' AND policyname = 'routes_owner_read'
  ) THEN
    CREATE POLICY routes_owner_read ON public.custom_routes
      FOR SELECT USING (
        user_id = auth.uid()
        OR public.is_admin(auth.uid())
      );
  END IF;
END $$;

-- IMPORTANT: if the builder's "share link" feature needs to look up a route by
-- slug for an unauthenticated or cross-user caller, implement a
-- SECURITY DEFINER function that accepts the share_slug as a parameter and
-- returns the row only when the slug matches. Example skeleton:
--
--   CREATE OR REPLACE FUNCTION public.get_shared_route(p_share_slug TEXT)
--   RETURNS public.custom_routes LANGUAGE plpgsql SECURITY DEFINER
--   SET search_path = public AS $$
--   BEGIN
--     RETURN QUERY SELECT * FROM public.custom_routes WHERE share_slug = p_share_slug;
--   END; $$;
--   GRANT EXECUTE ON FUNCTION public.get_shared_route(TEXT) TO anon, authenticated;


-- ── MON-03: Atomic booking creation with capacity lock ───────────────────
--
-- Replaces the plain INSERT in app/booking/actions.ts with an atomic
-- function that:
--   1. Locks the tour row (SELECT FOR UPDATE) to serialise concurrent bookings
--   2. Counts committed party sizes in the same time window
--   3. Raises an exception if capacity would be exceeded
--   4. Inserts the booking row
--
-- max_group_size = NULL or 0 is treated as unlimited.

CREATE OR REPLACE FUNCTION public.create_pending_booking(
  p_user_id    UUID,
  p_city_id    UUID,
  p_tour_id    UUID,
  p_layover_id UUID,
  p_party_size SMALLINT,
  p_pickup_at  TIMESTAMPTZ,
  p_dropoff_at TIMESTAMPTZ,
  p_base_cents INTEGER,
  p_currency   CHAR(3)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_group  INTEGER;
  v_booked     INTEGER;
  v_booking_id UUID;
BEGIN
  -- Lock the tour row so concurrent calls for the same tour are serialised.
  SELECT max_group_size INTO v_max_group
  FROM public.tours
  WHERE id = p_tour_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tour_not_found';
  END IF;

  -- Count total party sizes of live bookings that overlap the requested window.
  SELECT COALESCE(SUM(party_size), 0) INTO v_booked
  FROM public.bookings
  WHERE tour_id = p_tour_id
    AND status IN ('pending_payment', 'confirmed', 'paid', 'in_progress')
    AND scheduled_pickup_at  < p_dropoff_at
    AND scheduled_dropoff_at > p_pickup_at;

  -- Enforce capacity when max_group_size is set and positive.
  IF v_max_group IS NOT NULL AND v_max_group > 0
     AND v_booked + p_party_size > v_max_group THEN
    RAISE EXCEPTION 'tour_fully_booked';
  END IF;

  INSERT INTO public.bookings (
    user_id, city_id, tour_id, layover_id,
    party_size, scheduled_pickup_at, scheduled_dropoff_at,
    base_cents, addons_cents, total_cents, currency, status
  ) VALUES (
    p_user_id, p_city_id, p_tour_id, p_layover_id,
    p_party_size, p_pickup_at, p_dropoff_at,
    p_base_cents, 0, p_base_cents, p_currency, 'pending_payment'
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- Grant execute to authenticated users (called via the Supabase admin client
-- which uses service_role and bypasses RLS, but explicit GRANT is good practice).
GRANT EXECUTE ON FUNCTION public.create_pending_booking(
  UUID, UUID, UUID, UUID, SMALLINT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, CHAR(3)
) TO authenticated, service_role;


-- ── MON-08: Prevent double-booking the same tour on the same day ─────────
--
-- A partial unique index prevents a user from having two active bookings for
-- the same tour on the same calendar day — the most common tab-race scenario.
-- Different days are permitted (a user can book the same tour on two trips).

CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_tour_day_active
  ON public.bookings (user_id, tour_id, (scheduled_pickup_at::date))
  WHERE status IN ('pending_payment', 'confirmed', 'paid', 'in_progress');


-- ── SEC-01 (informational): Users table column protection ────────────────
--
-- The audit identified that the "Users update own row" RLS policy allows
-- direct PATCH of sensitive columns (is_admin, stripe_customer_id) via
-- PostgREST. The application never sends these columns, but a malicious
-- authenticated user could call the REST API directly.
--
-- The correct fix is a BEFORE UPDATE trigger that forces sensitive columns
-- to retain their old values regardless of what the caller sends.

CREATE OR REPLACE FUNCTION public.protect_user_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent unprivileged callers from escalating to admin or altering
  -- Stripe / verification flags via the public REST API.
  NEW.is_admin            := OLD.is_admin;
  NEW.stripe_customer_id  := OLD.stripe_customer_id;
  NEW.is_verified         := OLD.is_verified;
  RETURN NEW;
END;
$$;

-- Only apply the protection to calls made by non-service-role connections.
-- Service-role callers (admin server actions) bypass RLS and can legitimately
-- update these columns; the trigger guard is for the anon/authenticated roles.
DROP TRIGGER IF EXISTS trg_protect_user_sensitive ON public.users;
CREATE TRIGGER trg_protect_user_sensitive
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  -- Skip the guard when the current role is service_role (admin actions)
  WHEN (current_setting('role', true) != 'service_role')
  EXECUTE FUNCTION public.protect_user_sensitive_columns();
