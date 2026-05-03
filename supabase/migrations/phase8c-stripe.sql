-- Phase 8c — Stripe Checkout: sync state, webhook dedup, booking lifecycle columns
-- Idempotent: safe to re-run.
-- Run in Supabase SQL Editor before deploying Phase 8c code.

BEGIN;

-- ============================================================
-- Part 1 — Stripe sync state on addons + tours
-- ============================================================

ALTER TABLE public.addons
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_sync_error  TEXT;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_sync_error  TEXT;

-- ============================================================
-- Part 2 — Webhook event dedup table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id              TEXT PRIMARY KEY,          -- Stripe event ID (evt_...)
  type            TEXT NOT NULL,
  livemode        BOOLEAN NOT NULL,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON public.stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created
  ON public.stripe_events(processed_at DESC);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_admin_only ON public.stripe_events;
CREATE POLICY events_admin_only ON public.stripe_events
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- Part 3 — Booking lifecycle columns for Stripe
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_session_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id  TEXT,
  ADD COLUMN IF NOT EXISTS paid_at                   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_url               TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session
  ON public.bookings(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_paid_at
  ON public.bookings(paid_at)
  WHERE paid_at IS NOT NULL;

-- ============================================================
-- Part 4 — Expand bookings.status CHECK to include 'paid'
-- ============================================================

DO $$
DECLARE
  cons_name TEXT;
BEGIN
  -- Find and drop the status-related CHECK constraint
  SELECT con.conname INTO cons_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE rel.relname = 'bookings'
     AND nsp.nspname = 'public'
     AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) ILIKE '%status%'
     AND pg_get_constraintdef(con.oid) NOT ILIKE '%dropoff%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', cons_name);
  END IF;

  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN (
      'draft', 'pending_payment', 'paid', 'confirmed',
      'in_progress', 'completed', 'cancelled', 'refunded', 'no_show'
    ));
END $$;

COMMIT;

-- ============================================================
-- Sanity check
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM public.stripe_events)        AS stripe_events_rows,
  (SELECT COUNT(*) FROM public.addons
    WHERE stripe_product_id IS NOT NULL)              AS addons_synced,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'bookings'
      AND column_name = 'stripe_session_id')          AS session_col_exists;
-- Expect: 0, 0, 1
