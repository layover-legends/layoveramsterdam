-- Phase Ops: Service Health & Usage Dashboard
-- Creates snapshot + threshold tables. Safe to re-run (idempotent).

CREATE TABLE IF NOT EXISTS public.service_health_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service      TEXT NOT NULL CHECK (service IN
    ('supabase','vercel','mapbox','deepl','resend','stripe','cloudflare','google','flightaware')),
  status       TEXT NOT NULL CHECK (status IN ('healthy','degraded','down','unknown')),
  latency_ms   INT,
  quota_used   BIGINT,
  quota_limit  BIGINT,
  quota_unit   TEXT,
  metadata     JSONB,
  error_message TEXT,
  checked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_service_time
  ON public.service_health_snapshots(service, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_status
  ON public.service_health_snapshots(status)
  WHERE status != 'healthy';

CREATE TABLE IF NOT EXISTS public.service_alert_thresholds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service    TEXT NOT NULL,
  metric     TEXT NOT NULL,
  warn_at    NUMERIC NOT NULL,
  crit_at    NUMERIC NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (service, metric)
);

ALTER TABLE public.service_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_alert_thresholds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_health_snapshots' AND policyname = 'health_admin_only'
  ) THEN
    CREATE POLICY health_admin_only ON public.service_health_snapshots
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_alert_thresholds' AND policyname = 'thresholds_admin_only'
  ) THEN
    CREATE POLICY thresholds_admin_only ON public.service_alert_thresholds
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

INSERT INTO public.service_alert_thresholds (service, metric, warn_at, crit_at) VALUES
  ('supabase',    'latency_ms',  500,  2000),
  ('mapbox',      'quota_pct',    70,    90),
  ('deepl',       'quota_pct',    75,    95),
  ('resend',      'quota_pct',    70,    90),
  ('vercel',      'quota_pct',    80,    95),
  ('stripe',      'latency_ms', 1500,  5000),
  ('flightaware', 'quota_pct',    70,    90)
ON CONFLICT (service, metric) DO NOTHING;
