-- Phase 9b — GDPR + legal schema additions
-- Run in Supabase SQL Editor (idempotent — safe to re-run)

-- ── 1. Adult verification columns on users ───────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dob             DATE,
  ADD COLUMN IF NOT EXISTS adult_consent_at TIMESTAMPTZ;

-- ── 2. audit_logs — GDPR-required record of account lifecycle events ─────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,
  payload     JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_event
  ON public.audit_logs(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_admin_read'
  ) THEN
    CREATE POLICY audit_logs_admin_read ON public.audit_logs
      FOR SELECT USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_user_insert'
  ) THEN
    -- Server actions insert via service-role, but allow user_id = own uid for app-level events
    CREATE POLICY audit_logs_user_insert ON public.audit_logs
      FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;

-- ── 3. age_verification_logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.age_verification_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES public.users(id) ON DELETE CASCADE,
  dob           DATE        NOT NULL,
  verified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    INET,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_age_verif_user
  ON public.age_verification_logs(user_id, verified_at DESC);

ALTER TABLE public.age_verification_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'age_verification_logs' AND policyname = 'age_verif_admin_read'
  ) THEN
    CREATE POLICY age_verif_admin_read ON public.age_verification_logs
      FOR SELECT USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- service-role inserts only (server action), no user-direct insert policy needed

-- ── 4. export_rate_limits — 1 export per 24h per user ────────────────────────
CREATE TABLE IF NOT EXISTS public.export_rate_limits (
  user_id     UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_export TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.export_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'export_rate_limits' AND policyname = 'export_rate_limit_own'
  ) THEN
    -- Users can read/write their own rate-limit row (upserted server-side via RLS client)
    CREATE POLICY export_rate_limit_own ON public.export_rate_limits
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 5. Verify gdpr_accepted_at column exists (added in earlier migration) ─────
-- gdpr-consent.sql already added this column; this is a safety check only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'gdpr_accepted_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN gdpr_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── 6. Sanity-check SELECTs ───────────────────────────────────────────────────
SELECT 'audit_logs'           AS tbl, count(*) FROM public.audit_logs;
SELECT 'age_verification_logs' AS tbl, count(*) FROM public.age_verification_logs;
SELECT 'export_rate_limits'   AS tbl, count(*) FROM public.export_rate_limits;
SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name IN ('dob', 'adult_consent_at', 'gdpr_accepted_at')
  ORDER BY column_name;
