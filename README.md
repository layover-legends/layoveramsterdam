# Layover Amsterdam

Premium layover tours at Amsterdam Schiphol — built on Next.js 14 + Supabase + Vercel.

## Status

- **Phase 1 (live):** Coming-soon landing page
- **Phase 2 (planned):** Full booking flow, i18n (8 languages), payments (Stripe), maps (Mapbox)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

This repo is configured for zero-config deploy on Vercel. Connect the GitHub repo in Vercel and it builds automatically on every push to `main`. 

## Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Storage:** Supabase Storage (`assets` bucket)
- **Hosting:** Vercel
- **Email:** Resend (Phase 2)
- **Payments:** Stripe (Phase 2)
- **Maps:** Mapbox (Phase 2)
