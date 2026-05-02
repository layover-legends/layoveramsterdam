-- Phase 8a: Custom Routes (Tour Builder)
-- Creates the custom_routes table and wires the FK into bookings.
-- Safe to re-run: all statements are idempotent.

-- ── custom_routes ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_routes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id                UUID NOT NULL REFERENCES public.cities(id),
  user_id                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  share_slug             TEXT UNIQUE,
  layover_minutes        INT  NOT NULL,
  airport_buffer_minutes INT  NOT NULL DEFAULT 90,
  transport_mode         TEXT NOT NULL DEFAULT 'driving'
    CHECK (transport_mode IN ('driving', 'walking', 'cycling', 'public_transit')),
  stop_ids               UUID[] NOT NULL,
  total_travel_minutes   INT,
  total_visit_minutes    INT,
  total_distance_meters  INT,
  geometry_json          JSONB,
  legs_json              JSONB,
  is_saved               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_routes_user
  ON public.custom_routes(user_id) WHERE is_saved;

CREATE INDEX IF NOT EXISTS idx_custom_routes_share
  ON public.custom_routes(share_slug) WHERE share_slug IS NOT NULL;

ALTER TABLE public.custom_routes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_routes' AND policyname = 'routes_owner_or_share_read'
  ) THEN
    CREATE POLICY routes_owner_or_share_read ON public.custom_routes
      FOR SELECT USING (
        user_id = auth.uid()
        OR share_slug IS NOT NULL
        OR public.is_admin(auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_routes' AND policyname = 'routes_owner_write'
  ) THEN
    CREATE POLICY routes_owner_write ON public.custom_routes
      FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_routes' AND policyname = 'routes_owner_update'
  ) THEN
    CREATE POLICY routes_owner_update ON public.custom_routes
      FOR UPDATE USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── bookings: add custom_route_id FK ─────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS custom_route_id UUID
    REFERENCES public.custom_routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_custom_route
  ON public.bookings(custom_route_id) WHERE custom_route_id IS NOT NULL;
