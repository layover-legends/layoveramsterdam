# LayoverAmsterdam

> Amsterdam Schiphol layover-tour platform. Building toward a multimillion-euro
> business — every choice is for scale, never for a quick fix.

---

## Mission

Travelers connecting through Schiphol get 4–12 hours of free time. Most stay in the airport. We turn that time into a curated, high-margin Amsterdam experience: from a first-time-traveler's "show me the canals" stroll to a connoisseur's after-dark itinerary. Tours mix free public stops (canals, markets, hofjes) with paid bookable highlights (museums, brewery tastings, brunch spots). Margin comes from the free stops; bookable add-ons capture the willingness to pay.

The current site is a coming-soon landing page that captures early-access signups via Google OAuth. Phase 2 brings the full booking flow.

---

## Stack at a glance

| Layer            | Choice                                  | Why                                                              |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------- |
| Framework        | Next.js 14 (App Router)                 | Server components, Server Actions, Edge functions, great DX      |
| Language         | TypeScript (strict)                     | Type safety from DB through UI                                   |
| Styling          | Tailwind CSS 3.4                        | Brand tokens in `tailwind.config.ts`                             |
| Database / Auth  | Supabase (Postgres + Auth + Storage)    | RLS for security, generous free tier, Stripe-friendly            |
| Hosting          | Vercel                                  | Auto-deploy on push to `main`                                    |
| Domains          | `layover-legends.com` (Cloudflare DNS)  | Plus `layoveramsterdam.vercel.app` for previews                  |
| Email            | Resend                                  | Transactional + future broadcast (DNS already verified)          |
| Maps             | Mapbox GL JS                            | Currently disabled on homepage; revisit when token is ready      |
| Payments (Phase 2) | Stripe                                | Pulled later — see `tasks` doc                                    |

---

## Repo layout

```
code/
├── app/                       # Next.js App Router
│   ├── page.tsx               # Public homepage (coming-soon + StopsTeaser)
│   ├── layout.tsx
│   ├── globals.css
│   ├── account/               # Signed-in user profile
│   │   ├── page.tsx
│   │   └── actions.ts         # server actions for profile updates
│   ├── auth/
│   │   ├── callback/route.ts  # Supabase OAuth callback
│   │   └── signout/route.ts
│   └── admin/                 # Admin only — gated by requireAdmin()
│       ├── layout.tsx
│       ├── page.tsx           # Overview metrics
│       ├── users/             # Searchable user list
│       └── stops/             # CRUD for destinations + photo gallery
├── components/                # Shared UI components
│   ├── SignInWithGoogle.tsx
│   ├── StopsTeaser.tsx
│   ├── AccountForm.tsx
│   └── admin/                 # Admin-only components
├── lib/
│   ├── supabase/              # client + server Supabase factories
│   ├── auth/require-admin.ts  # admin gate
│   ├── admin/                 # admin queries (server-only) + types (client-safe)
│   ├── public/                # public queries
│   ├── constants/             # languages, countries
│   ├── types/                 # shared types
│   └── validation/            # server-side input validation
├── supabase/migrations/       # SQL migrations (run manually in Supabase Studio)
└── .claude/                   # this folder — slash commands + agents
```

---

## Database schema (essentials)

The schema is **enterprise-grade and pre-existing** — never create a parallel
table when an existing one fits. When in doubt, query
`information_schema.tables WHERE table_schema = 'public'` first.

### Identity

- `auth.users` — Supabase-managed
- `public.users` — app-side profile (FK `id` → `auth.users.id`, `ON DELETE CASCADE`)
  - `is_admin` (BOOLEAN) — gates `/admin`
  - `marketing_opt_in`, `phone`, `nationality`, `preferred_language`, `stripe_customer_id`, `is_verified`
  - `on_auth_user_created` trigger creates a row on every signup
  - RLS: each user reads/updates own row; admins read/update all (via `public.is_admin(uid)` SECURITY DEFINER fn)

### Catalog

- `destinations` — every stop, free or paid (single source of truth)
  - Key fields: `category_id`, `name`, `slug`, `area`, `description`, `latitude`, `longitude`
  - Flags: `is_active`, `requires_booking` (false = free catalogue), `is_seasonal`, `is_adult_only`, `wheelchair_accessible`
- `destination_categories` — taxonomy (Activities, Bars & Cafés, Canals & Streets, …)
- `stop_photos` — 1-to-many (destination has many photos, one is_primary)
- `stop_opening_hours` — 1-to-many (destination has hours per day_of_week)
- `after_dark_stops`, `seasonal_stops`, `weather_backup_stops`, `pickup_points` — type-specific add-ons keyed by `destination_id`

### Tours (Phase 2 — migration written, admin UI live)

- `tours` — packaged tours; key fields: `name`, `slug`, `tagline`, `description`, `duration_hours`, `price_cents`, `currency`, `max_group_size`, `is_active`, `requires_booking`, `is_adult_only`, `is_seasonal`
- `tour_stops` — junction (tour ↔ destination + `stop_order`); CASCADE-deletes when tour is removed
- Admin pages: `/admin/tours` list, `/admin/tours/new`, `/admin/tours/[id]` edit
- Data layer: `lib/admin/tours.ts` + `lib/admin/tours-types.ts`; actions in `app/admin/tours/actions.ts`
- Migration: `supabase/migrations/tours-setup.sql` — **run in Supabase SQL Editor before using the UI**
- `tour_addons`, `route_stops`, `booking_stops` — planned for Phase 2 booking flow (not yet created)

### Other notable tables

- `email_logs`, `email_templates` — Resend integration
- `notifications`
- `translations` — i18n (8 languages already seeded)

---

## Conventions

### TypeScript

- **Strict mode** is non-negotiable. No implicit `any`.
- Server-only modules (anything importing from `@/lib/supabase/server`) **must
  not** be reachable from `"use client"` components. Split shared
  types/constants into a `*-types.ts` companion file so client components
  can import safely.
- Public types live in `lib/types/`, admin-facing in `lib/admin/`,
  public-facing in `lib/public/`.

### React / Next.js

- Default to **server components**. Reach for `"use client"` only when you
  need a hook, browser API, or event handler.
- **Server Actions** for all mutations. Use `revalidatePath()` after writes
  so server components re-render with fresh data.
- The `"use server";` directive **must be the first statement in the file**
  — not inside a function. Don't move it inside a function as a workaround;
  fix the real cause.
- `export const dynamic = "force-dynamic"` on every page that reads
  authenticated session data.

### Styling

- Tailwind only. Brand tokens (in `tailwind.config.ts`):
  - `brand.navy` `#0F172A` (page background)
  - `brand.cream` `#FFF7ED` (text)
  - `brand.orange` `#F97316` (accent)
- Tailwind `content` array **must include** `./app`, `./components`, `./lib`.
- For native `<select>` options on dark backgrounds, set inline styles
  (`backgroundColor: "#0F172A"`, `color: "#FFF7ED"`) — Tailwind classes on
  `<option>` are unreliable across browsers.

### Database

- All migrations go in `supabase/migrations/<descriptive-name>.sql` and are
  run manually via Supabase Studio's SQL Editor.
- Migrations **must be idempotent**: `CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, RLS policies
  wrapped in `DO $$ … IF NOT EXISTS … END $$`.
- **RLS is on for every public table.** Forgetting a SELECT policy when
  enabling RLS = blank dropdowns. Always pair `ENABLE ROW LEVEL SECURITY`
  with at least one `FOR SELECT USING (...)` policy.
- snake_case in DB, camelCase in TS. Map at the boundary
  (e.g. `rowToStop()` in `lib/admin/stops.ts`).

### Auth

- Public visitors → see homepage + sign-in.
- Signed in (any user) → can reach `/account`, edits their own row.
- `is_admin = true` only → can reach `/admin/*` (server-side `requireAdmin()`
  in every page; RLS at the DB level as defense-in-depth).
- Adding a new admin is a single SQL update (`UPDATE public.users SET is_admin = true WHERE email = '…'`), no deploy needed.

### Storage

- Single bucket: `assets` (public-read).
- Stop photos: `assets/stops/<destination_id>/<timestamp>.<ext>`.
- Storage RLS: public reads; only admins INSERT/UPDATE/DELETE under `stops/`.

### Vercel env vars (gotcha)

- **`NEXT_PUBLIC_*` variables marked "Sensitive" don't get inlined into the
  client bundle.** If you mark one Sensitive in the Vercel UI, you can't
  un-mark it; you must delete + re-create. Currently set as non-sensitive:
  `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Deploy flow

1. Edit code locally in VS Code.
2. `git add … && git commit -m "feat(scope): summary" && git push` from the
   integrated terminal.
3. Vercel auto-builds on push to `main`.
4. Watch the deploy at
   `https://vercel.com/layover-legends-1887s-projects/layoveramsterdam/deployments`.
5. SQL migrations are separate — paste into Supabase SQL Editor and run.
6. Production URL: `https://layover-legends.com` (also `layoveramsterdam.vercel.app`).

---

## Active tasks & near-term roadmap

- Mapbox preview: env var fixed, but homepage uses the legacy image. Bring it
  back to a small "where in Amsterdam" sidebar element on the future tour
  detail page.
- Stripe keys: pull when ready to wire payments.
- Real photos: upload at least one photo per featured stop so the
  StopsTeaser cards on the homepage have visuals.
- Set up `/admin/stops/[id]` opening-hours editor (table exists, UI not yet
  built).

---

## What "production-grade" means in this repo

Whenever a choice presents itself, pick the option that makes the system
**reuseable, scalable, and safe** even if it's slightly more work today.

- Foreign keys with `ON DELETE CASCADE` so deletes don't leave orphans.
- RLS at the database, not the app — even a routing bug can't leak data.
- Server-side validation for every user input (don't trust the form).
- Photos as a 1-to-many relation (every entity that *might* need a gallery
  later gets one now).
- Categories as rows in a table, never enums hardcoded in TypeScript.
- Idempotent migrations; the same migration can run on production, staging,
  and a fresh dev environment without errors.
- Indexes on every column we filter or sort by at scale.
- `revalidatePath` after every mutation so the UI never lies about cached
  state.

If a request would cut corners on any of the above, push back, suggest the
right way, and only proceed if the user explicitly accepts the shortcut.
