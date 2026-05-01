-- =========================================================================
-- Indexes on destinations filter columns.
--
-- The admin list page (/admin/stops) runs 6+ count(*) queries per render,
-- filtering on is_active / requires_booking / is_seasonal / is_adult_only.
-- Without these indexes, each one is a full-table scan. At 219 rows that's
-- invisible; at 50k rows it's a meaningful page-load cost.
--
-- All four are simple btree indexes (Postgres uses them for counts via
-- index-only scans). The existing primary key, slug uniqueness, category_id,
-- and (latitude, longitude) indexes stay unchanged.
--
-- Idempotent: safe to re-run.
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_destinations_is_active
  ON public.destinations (is_active);

CREATE INDEX IF NOT EXISTS idx_destinations_requires_booking
  ON public.destinations (requires_booking);

CREATE INDEX IF NOT EXISTS idx_destinations_is_seasonal
  ON public.destinations (is_seasonal);

CREATE INDEX IF NOT EXISTS idx_destinations_is_adult_only
  ON public.destinations (is_adult_only);

-- Verify.
SELECT indexname
  FROM pg_indexes
 WHERE schemaname = 'public' AND tablename = 'destinations'
 ORDER BY indexname;
