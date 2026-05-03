-- slug_redirects: permanent 301 map for renamed slugs.
--
-- At build time `scripts/build-redirects.ts` dumps this table to
-- `lib/generated/redirects.json`, which middleware.ts imports as a
-- static map — zero per-request DB cost.
--
-- When an admin renames a slug, the admin action upserts a row here
-- (with chain-resolution so A→B→C collapses to A→C).
--
-- Safe to re-run: all statements are idempotent.

CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('destination', 'tour', 'addon', 'article')),
  old_slug    TEXT NOT NULL,
  new_slug    TEXT NOT NULL,
  city_id     UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_redirects_no_self_loop CHECK (old_slug <> new_slug)
);

-- One old_slug per entity_type maps to exactly one new slug.
CREATE UNIQUE INDEX IF NOT EXISTS slug_redirects_entity_old_unique
  ON public.slug_redirects(entity_type, old_slug);

ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;

-- Admins can manage all rows.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'slug_redirects' AND policyname = 'slug_redirects_admin_all'
  ) THEN
    CREATE POLICY slug_redirects_admin_all ON public.slug_redirects
      FOR ALL USING (public.is_admin(auth.uid()));
  END IF;
END $$;
