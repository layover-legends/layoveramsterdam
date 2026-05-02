# Blueprint+ — moves above the master plan

The master plan gets to 80% (competitive parity). This file is the +30%
that lifts the platform from "tourism platform" to "category-defining."

Three pillars:
1. **Feature moats** — defensible, differentiating capabilities
2. **Design polish** — micro-interactions, motion, photography
3. **Web fluidity** — performance, perceived speed, edge architecture

Each item: title · cost (S/M/L) · phase to slot in.

---

## 1) Feature moats

### M1 · AI personal travelogue as the souvenir
**Cost**: M · **Phase**: 10
Master plan has a basic PDF souvenir. 110% = GPT-4 + tour photos + GPS
trace + (optional) audio recording → a written travelogue chapter that
reads like Lonely Planet wrote it about THEIR morning. Print-on-demand
option €15. Defensible because it's deeply personal.

### M2 · Live tour streaming to companion link
**Cost**: M · **Phase**: 10
Each booking auto-creates a private "watch live" URL. GPS + photos every
5 min go to the link. Recipient gets push notifications. 30-50% of
recipients book a layover tour within 30 days because they saw their
friend's. Viral mechanic. Built on Supabase Realtime + Mapbox.

### M3 · Voice-first guide app (AirPods mode)
**Cost**: L · **Phase**: 10.5
Most competitors give you a paper itinerary. 110% = AirPods-friendly audio
narration triggered by GPS proximity. "You're approaching the Anne Frank
House on your left. In 1942..." Recorded once per stop in 8 languages,
generated via 11Labs voice clones.

### M4 · B2B / airline partner API
**Cost**: M · **Phase**: 12
Productize the booking API. KLM/Delta/Air France can auto-offer your tours
when their flight is delayed >4h. Inventory unit economics flip massively.
Even one airline deal = thousands of bookings per month.

### M5 · Smart yield pricing (transparent)
**Cost**: S · **Phase**: 8
Static pricing leaves 5-15% on the table. Implement transparent dynamic
pricing: "10% off — rain forecast" / "Limited spots — premium rate." Reads
weather + day-of-week + event calendar + remaining inventory. Show the
reason inline (no surge pricing surprises).

### M6 · AI concierge chat in 8 languages, 24/7
**Cost**: M · **Phase**: 7c onwards
GPT-4 trained on your tour catalog + Amsterdam knowledge + local culture.
Human handoff for booking changes. Most ops-saving feature in the
industry. Pre-empts most cancellations.

### M7 · Open Amsterdam database (free SEO showcase)
**Cost**: S · **Phase**: 7c (parallel)
Publish the entire 219-stop database with hours, walking times, seasonal
patterns, photos under CC-BY. Travel bloggers, Wikipedia editors, even
competitors will link to it. Long-tail organic traffic compounds for
years. You become the canonical source.

---

## 2) Design polish — beyond the wireframes

### D1 · Hero motion — flight number types itself
**Cost**: S · **Phase**: 7c
Hero flight form pre-fills with a sample (KL 1234 → AF 567 → 2 people)
that types itself in like a typewriter on first load. Resets on hover/focus.
Signals "this is the form you fill" without instruction. ~50 lines JS.
**✅ `5f73d79`** — `components/public/HeroFlightForm.tsx` `useTypewriter` hook, resets on focus.

### D2 · Tour card micro-interactions
**Cost**: S · **Phase**: 7c
On hover: card lifts 4px, gold border fades in, photo zooms 1.05x, price
counts up from €0 to actual price over 400ms. CSS-only; no JS performance
hit.
**✅ `6ec0441`** — `components/public/TourCard.tsx`: lift + gold border + photo scale via CSS; `useCountUp` RAF loop for price animation.

### D3 · Map experience — clustering + flight-in cards
**Cost**: M · **Phase**: 7c
Click cluster → smooth zoom + flyout tour cards on the right. Click a stop
→ animated dashed route appears between it and the airport. Premium feel.
**✅ `42ebf70`** — `components/public/StopsMap.tsx`: GeoJSON source with `cluster:true`, `easeTo()` zoom, branded popup with stop name + link. All active destinations shown.

### D4 · Form fluidity — auto-format flight numbers
**Cost**: S · **Phase**: 7c
"kl1234" → "KL 1234" formatted live. Real-time validation against
FlightAware (200ms debounced). Subtle green check ✓ when valid, never red
until blur. Failures: "KL1234 doesn't match — did you mean KL1244?"
**✅ `5f73d79`** — `formatFlightNumber()` in `HeroFlightForm.tsx`: uppercase + space after 2-letter IATA code, applied on blur.

### D5 · Skeleton loaders in brand colors
**Cost**: S · **Phase**: 7c onwards
Most sites show empty space or generic spinners. Premium brands use
shimmering skeletons that match the final layout. Card outlines in
warm-cream, shimmer in gold gradient. Perceived speed up by 30%.
**✅ `a7733b9`** — `TourCardsSkeleton` + `ReviewsSkeleton` in `app/page.tsx` using `animate-pulse` as Suspense fallbacks for streaming sections.

### D6 · Page transitions via View Transitions API
**Cost**: S · **Phase**: 7c onwards
Chrome 111+ supports CSS-only crossfade between routes. No JS lib.
Booking → confirmation feels native-app-fluid. Falls back to default in
older browsers.
**✅ `a7733b9`** — `@view-transition { navigation: auto; }` added to `app/globals.css`.

### D7 · Commissioned photography for top 50 stops
**Cost**: M-L (budget) · **Phase**: Ongoing
Most tourism sites use Unsplash. Visible difference. Hire one photographer
for one weekend, get 200+ shots. Even AI-upscaled smartphone photos beat
stock if they show real people + real moments. Photography quality is the
#1 perceived-quality lever in tourism.

### D8 · Microcopy that reinforces the tagline
**Cost**: S · **Phase**: Ongoing
"Don't waste your layover" should echo through the product:
- Booking CTA: "Don't miss it — book in 60 seconds"
- Post-payment: "Don't worry, we drop you back 90 min before takeoff"
- Empty states: "Don't waste your layover scrolling — here's what fits..."
Build a `lib/i18n/voice.ts` style guide.

### D9 · Empty / error / loading states v2
**Cost**: M · **Phase**: 7c onwards
- **Empty** = reframe ("Where will your next layover take you? AMS, CDG, DXB coming soon")
- **Error** = recover ("FlightAware unreachable. Tap to retry, or skip — we'll verify before pickup")
- **Loading** = inform ("Verifying your KL1234 with FlightAware...")

---

## 3) Web fluidity — performance moats

### F1 · Lighthouse 95+ on mobile
**Cost**: S-M · **Phase**: 7c onwards
Target Performance, Accessibility, Best Practices, SEO all 95+. Mobile
Slow 4G. Set Lighthouse CI as a deploy gate — block PRs that regress
below 90.
**⏳ Pending** — run after deploy: `npx lighthouse https://layover-legends.com --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile`. Mapbox GL JS is the main perf variable.

### F2 · ISR for every public page
**Cost**: S · **Phase**: 7c
Destinations / tours / blog all cacheable at the edge with `revalidate:
60`. First load = static HTML from Vercel CDN, <100ms TTFB worldwide.
**✅ `a7733b9`** — `export const revalidate = 60` on `app/page.tsx`. Replaces `force-dynamic`; tour cards + reviews stream in via Suspense.

### F3 · Streaming server components
**Cost**: S · **Phase**: 7c
Wrap slow data fetches in `<Suspense>` boundaries. Header + nav renders
in 100ms while tour data streams in. User sees the page immediately.
**✅ `a7733b9`** — `FeaturedToursStream` + `ReviewsStream` async components wrapped in `<Suspense>` in `app/page.tsx`.

### F4 · Optimistic UI on actions
**Cost**: S · **Phase**: 8
Clicking "Add to tour" reflects in the right rail in <16ms (optimistic
update), syncs to DB in background, rolls back gracefully if it fails.
Linear / Stripe Dashboard / Notion pattern.

### F5 · Predictive prefetch
**Cost**: S · **Phase**: 7c
When user hovers a tour card for >200ms, prefetch the booking flow data
+ assets. By the time they click, the booking page is warm. Built into
Next.js Link by default.
**✅ `6ec0441`** — `TourCard.tsx` uses `<Link>` with Next.js default `prefetch={true}`. No extra work needed; framework handles it.

### F6 · Image pipeline — AVIF/WebP + blur placeholders + art direction
**Cost**: S · **Phase**: 7a or 7c
Currently `unoptimized` is set on the StopsTeaser images. Remove that.
Use Next.js Image with AVIF first, blur-up `placeholder="blur"` from a
16x16 blurDataURL, art-directed crops (vertical mobile, wide desktop).
Page weight drops 60-80%.
**✅ `a7733b9`** — Removed `unoptimized` from `StopsTeaser.tsx`. Next.js Image now serves AVIF/WebP automatically. `blur-up` placeholder deferred to when real photos have known dimensions.

### F7 · Partial hydration / minimize client JS
**Cost**: S-M · **Phase**: 7c onwards
Audit every `"use client"` directive — most pages should be 100% server
components. Target: <200KB JS shipped on landing.

### F8 · Edge auth via Supabase
**Cost**: S · **Phase**: 7c
Move the Supabase auth check to Vercel Edge Middleware. Authenticated
admin / account pages skip the cold-start penalty. Saves 200-400ms per
auth-gated request worldwide.

### F9 · Real-time updates via Supabase Realtime
**Cost**: M · **Phase**: 8 and 9
Replace polling with Supabase Realtime subscriptions: booking status,
live van GPS, tour-active stop completion. Free at our scale.

### F10 · Offline-first PWA
**Cost**: M · **Phase**: 10 alternative
Before building a full React Native app, ship a PWA. Service worker caches
itinerary + tour notes + map tiles. 80% of native app value at 10% of cost.
Defer only if master plan demands native.

---

## 4) Architectural decisions to make NOW (so 110% stays cheap)

### A1 · Treat the souvenir as a first-class entity, not a file
**Phase**: 7b (with booking primitives)
Souvenirs table: `booking_id`, `gps_trace JSONB`, `photo_refs[]`,
`audio_ref`, `ai_text`, `pdf_url`, `weather_at_time`. Generate the PDF on
demand, not at tour end. Unlocks M1 (AI travelogue) and M2 (live streaming).
**✅ `a049b04`** — `public.souvenirs` table in `supabase/migrations/booking-primitives.sql`. Admin list at `/admin/souvenirs`.

### A2 · Build the public API as the partner API
**Phase**: 7b onwards
Every endpoint Claude Code builds passes two checks:
- Versioned (`/api/v1/...`)?
- Stable + documented response shape?
+10% effort per endpoint, saves a 6-month rebuild when M4 (airline
partnership) lands.
**✅ `e438d75`** — `/api/v1/layovers`, `/api/v1/bookings`, `/api/v1/bookings/[id]` + `docs/API.md` contract stub.

### A3 · Capture every event with rich props
**Phase**: 7c onwards
Don't just `track("tour_booked")`. Track:
```ts
track("tour_booked", {
  tour_id, layover_id, party_size,
  flight_in, flight_out, layover_minutes, terminal,
  weather_forecast, day_of_week, lead_time_days,
  promo_code, addons, total_cents, currency, locale,
  referrer_path, conversion_path[],
});
```
Without rich props, smart pricing and segmentation are blind.
**✅ `c2dcbf9`** — `public.analytics_events` table + `lib/analytics/track.ts` helper (server-only, fire-and-forget). Wired into layover_submitted, booking_created, booking_cancelled.

### A4 · Bake GDPR data export into every entity
**Phase**: 7b
Add `/account/export` endpoint that ships user data as JSON (GDPR Art. 20).
Stub it now with all current entities. Each new entity in future phases
adds itself to the export.
**✅ `e72b69e`** — `/account/export` route returns full JSON bundle: profile, bookings, layovers, reviews, souvenirs, account_events. `Content-Disposition: attachment`. Add new entities to the export as they ship in future phases.

### A5 · Internationalize images and currency from day one
**Phase**: 7c
Tour photos: store multiple variants per stop (square / vertical / wide).
Prices: store cents in EUR, convert at render via `formatPrice(locale)`.
**✅ `31c223b`** — `lib/i18n/format-price.ts`: `formatPrice(cents, currency, locale)` using `Intl.NumberFormat`. Tour card prices locale-aware. Multi-variant photo storage deferred to Phase 8 (needs photographer first — D7).
Avoids a US tourist seeing €69,00 (Dutch format) when expecting $74.99.

---

## 5) The "wow moments" budget

Individually small but aggregate into "this feels different":

- **Page load sound** (off by default, settings toggle): subtle airport PA
  chime when home page first loads
- **Departure board font on flight numbers**: JetBrains Mono in Legend
  Gold on Ink Black, like an airport monitor
- **Tour completion confetti + map trace replay**: when admin marks
  booking complete, customer sees their tour route animate on the map
  with photos popping in at each stop
- **Email designs**: Cormorant Garamond + Legend Gold + printed-postcard
  aesthetic. Booking confirmation as 1920s travel ticket, not corporate PDF
- **Receipt as souvenir**: receipt itself is a beautiful artifact people
  screenshot and share

---

## How to use this file

When starting a phase:
1. Read DESIGN_NOTES.md (refinements within scope)
2. Read this file (BLUEPRINT_PLUS.md, moats above scope)
3. Decide: which Blueprint+ items are cheap enough to bake in NOW vs.
   defer to a follow-up phase?
4. After each phase, mark addressed items with ✅ + commit hash

The 80% master plan is the floor. Use this file to push every phase
toward the ceiling.
