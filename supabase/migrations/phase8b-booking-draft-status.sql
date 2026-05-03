-- Phase 8b — Add 'draft' to bookings.status CHECK constraint
-- Allows placeholder bookings before Stripe payment intent is created (Phase 8c).
-- Idempotent: safe to re-run.

DO $$
DECLARE
  cons_name TEXT;
BEGIN
  -- Find the status-related CHECK constraint on bookings
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
      'draft', 'pending_payment', 'confirmed',
      'in_progress', 'completed', 'cancelled', 'refunded', 'no_show'
    ));
END $$;

SELECT 'phase8b: draft status added to bookings.status CHECK' AS result;
