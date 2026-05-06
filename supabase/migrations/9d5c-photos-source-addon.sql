-- Phase 9d.5c: add 'addon' to photos.source CHECK constraint.
-- Addon hero images currently upload as source='tour' (wrong semantics).
-- This lets callers pass source='addon' so Asset Library filter works correctly.
--
-- Apply via Supabase MCP before deploying the 9d.5c code changes.

DO $$
DECLARE v_conname TEXT;
BEGIN
  SELECT c.conname INTO v_conname
    FROM pg_constraint c
    JOIN pg_class t      ON c.conrelid   = t.oid
    JOIN pg_namespace n  ON t.relnamespace = n.oid
   WHERE n.nspname = 'public'
     AND t.relname = 'photos'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%source%';
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.photos DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END $$;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_source_check
  CHECK (source IN (
    'tour','staff','vehicle','destination','about',
    'marketing','customer_upload','review',
    'addon'
  ));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid = 'public.photos'::regclass
   AND contype  = 'c'
   AND pg_get_constraintdef(oid) LIKE '%source%';
