---
description: Capacity / performance audit — what breaks at 10x, 100x, 1000x current load?
---

# Scale audit: $ARGUMENTS

We are building toward millions of users. The job here isn't to optimise
prematurely — it's to find the cliffs we'd fall off **at predictable scale
points** and either re-engineer them or document the trade-off.

## Scale targets to plan for

| Stage     | DAU      | Concurrent  | Stops in catalog | Tours / month | Bookings / month |
| --------- | -------- | ----------- | ---------------- | ------------- | ---------------- |
| Today     | <100     | <10         | 112              | 0             | 0                |
| 6 months  | 5k       | ~200        | 500+             | 50            | 1k               |
| 18 months | 50k      | ~2k         | 2k               | 200           | 20k              |
| 3 years   | 500k     | ~20k        | 5k               | 500           | 200k             |

## Audit checklist

### Database

- [ ] Every `WHERE`/`JOIN`/`ORDER BY` column has an index. Run
      `EXPLAIN ANALYZE` on critical queries; if the planner does a Seq Scan
      over a growing table, fix it.
- [ ] No N+1 patterns. List queries should `select(parent_cols, child(*))`
      to single-trip the join, or batch.
- [ ] Pagination is **always** in place on user-visible lists. Default
      page size 25–50, max 100.
- [ ] Aggregate counts: at < 100k rows, COUNT(*) is fine. At > 1M rows,
      switch to a maintained counter table or `pg_stat_user_tables.n_live_tup`.
- [ ] Hot writes have indexes only where read-paths need them — don't
      over-index.
- [ ] No `SELECT *` from tables with `text` payload columns when only IDs
      are needed.
- [ ] RLS policies don't do per-row subqueries that table-scan
      (use `SECURITY DEFINER` helper fn like `public.is_admin`).

### Caching

- [ ] Public, mostly-static reads use Next.js `cache()` and reasonable
      `revalidate` windows.
- [ ] Mutations call `revalidatePath()` for every surface that displays
      the data.
- [ ] CDN-cacheable assets (images, fonts) hit Vercel's CDN with long
      `cache-control`.

### Storage

- [ ] User-uploaded images go through a path with a `<id>/<timestamp>`
      structure (no collisions, easy to clean up).
- [ ] On delete of the parent row, photos are removed from Storage too.
- [ ] Image sizes capped server-side (already 5 MB).

### Server actions / edge

- [ ] Heavy actions (>500ms p95) are tracked. If we hit slow queries,
      either index, materialize, or move to a background worker.
- [ ] No unbounded loops in actions (`for (const x of allRows) { … }` —
      bound it or paginate).

### Auth / RLS

- [ ] `requireAdmin()` queries one row, not a table scan.
- [ ] Avoid policies that fan out (`EXISTS (SELECT 1 FROM big_table … )`).
      Use a SECURITY DEFINER helper instead.

### UI

- [ ] Hot pages render under 1 s on mobile 3G. Move heavy components
      behind `next/dynamic` with `ssr: false` only when needed.
- [ ] No client-side bundle growth without a reason — `npm run build`
      logs first-load JS per route; investigate if any route pushes past
      300 KB compressed.
- [ ] Images use Next/Image with proper `sizes` so we don't ship 4K assets
      to mobile.

### Observability

- [ ] Errors in server actions logged with enough context to debug.
- [ ] Vercel Analytics / Speed Insights enabled for prod.
- [ ] Uptime monitoring on `https://layover-legends.com`.

### Money / business risk

- [ ] Free-tier limits documented (Supabase 500 MB DB, 1 GB Storage,
      Resend 3k emails/mo). When we approach limits, we have a plan.
- [ ] Stripe usage doesn't double-charge on retries (idempotency keys).
- [ ] Mapbox token domain-restricted to our domains (else free tier
      drains from someone scraping).

## Output format

Produce a single document with three buckets:

```
## 🟢 Already scale-ready
- (things that won't bend in the next 18 months)

## 🟡 Needs attention before next milestone
1. <area> — <issue> — <fix> — <when this becomes blocking>
2. …

## 🔴 Will break at scale
- (things that work today but will catastrophically fail at known load —
  fix order, rough effort, business risk)
```

Then propose the **single most impactful improvement** to ship this week.
