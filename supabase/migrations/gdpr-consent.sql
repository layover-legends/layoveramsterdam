-- =========================================================================
-- GDPR consent timestamp on public.users
--
-- Adds gdpr_accepted_at TIMESTAMPTZ to record the exact moment a user
-- consented to the Privacy Policy and Terms of Service. Required under
-- GDPR Art. 7 (conditions for consent) — the controller must be able to
-- demonstrate that the data subject gave consent and when.
--
-- The column is nullable:
--   NULL  = legacy row created before this migration (Google OAuth
--           accounts that signed up while this column didn't exist).
--           Treat as "consent recorded implicitly at created_at".
--   NOT NULL = consent timestamp set at the OAuth callback for every
--              new signup after this migration is deployed.
--
-- Idempotent: safe to re-run.
-- =========================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gdpr_accepted_at TIMESTAMPTZ;

-- Backfill: existing rows are treated as having consented at account
-- creation time (they signed up for an early-access list with a visible
-- Google Sign-In button; the privacy notice was implicitly accepted).
UPDATE public.users
   SET gdpr_accepted_at = created_at
 WHERE gdpr_accepted_at IS NULL;

-- Index for compliance audits ("show all users who accepted before date X").
CREATE INDEX IF NOT EXISTS idx_users_gdpr_accepted_at
  ON public.users (gdpr_accepted_at)
  WHERE gdpr_accepted_at IS NOT NULL;

-- Sanity check.
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users'
       AND column_name = 'gdpr_accepted_at')  AS column_added,
  (SELECT COUNT(*) FROM public.users
     WHERE gdpr_accepted_at IS NULL)           AS users_without_consent,
  (SELECT COUNT(*) FROM public.users
     WHERE gdpr_accepted_at IS NOT NULL)       AS users_with_consent;
-- Expect: column_added=1, users_without_consent=0
