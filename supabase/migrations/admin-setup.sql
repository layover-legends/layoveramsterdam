-- =========================================================================
-- Admin setup migration for Layover Amsterdam
-- Run this once in Supabase Dashboard → SQL Editor.
-- Idempotent: safe to run multiple times.
-- =========================================================================

-- 1) Add an is_admin flag on public.users.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Mark Steven (the founder) as admin. Change the email if you ever
--    transfer ownership; add new admins by repeating this UPDATE for them.
UPDATE public.users
   SET is_admin = TRUE
 WHERE email = 'travellayoverlegends@gmail.com';

-- 3) Helper function the RLS policies use to test admin status without
--    recursing into the users table's own policies. SECURITY DEFINER runs
--    with the owner's privileges, sidestepping the row-level checks.
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = uid), FALSE);
$$;

-- 4) RLS policy: admins can SELECT every row in public.users (the existing
--    "Users see own data" policy still applies to non-admins).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'users'
       AND policyname = 'Admins read all users'
  ) THEN
    CREATE POLICY "Admins read all users" ON public.users
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 5) Optional but useful: admins can UPDATE any row (for things like
--    marking someone as verified later). Existing "Users update own data"
--    still covers each user editing themselves.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'users'
       AND policyname = 'Admins update all users'
  ) THEN
    CREATE POLICY "Admins update all users" ON public.users
      FOR UPDATE
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 6) Sanity check.
SELECT
  (SELECT COUNT(*) FROM public.users WHERE is_admin = TRUE) AS admin_count,
  (SELECT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname='public' AND tablename='users'
                     AND policyname='Admins read all users')) AS admins_read_policy,
  (SELECT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname='public' AND tablename='users'
                     AND policyname='Admins update all users')) AS admins_update_policy;
