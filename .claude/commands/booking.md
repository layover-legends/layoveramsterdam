---
description: Build / extend the booking flow (customer-facing tour booking)
---

# Booking flow: $ARGUMENTS

The booking experience is where the business makes money. Mobile-first,
fast, and forgiving. Read `/stripe` first if payments aren't wired yet.

## Required tables

- `tours` — packaged tour with `duration_minutes`, `base_price_cents`, `currency`, `is_active`, `max_party_size`
- `tour_stops` — junction `(tour_id, destination_id, stop_order)`
- `tour_addons` — optional paid extras per tour
- `bookings` — see `/stripe` for schema
- `tour_availability` (new if missing) — `(tour_id, available_date, slots_remaining, price_override_cents)`

## Customer flow

1. **Browse** — `/tours` lists active tours filtered by duration / time of day
2. **Detail** — `/tours/[slug]` shows itinerary (joined `tour_stops` →
   `destinations`), photo carousel, total time, price, "what's included"
3. **Date picker** — calendar showing dates with `slots_remaining > 0`
4. **Time slot** — show start times for the chosen date
5. **Party size** — capped by tour `max_party_size` and slot capacity
6. **Add-ons** — checkbox each `tour_addons` item
7. **Review** — line items, total, duration, meeting point
8. **Pay** — Stripe Checkout (see `/stripe`)
9. **Confirmation** — `/account/bookings/[id]` with QR code, calendar invite link, what to bring

## Server-side rules

- Always check capacity **inside a transaction** before creating a `pending`
  booking: `SELECT … FOR UPDATE` on the availability row, decrement, insert
  booking, commit. Otherwise overselling on parallel requests.
- The booking only counts as `paid` after the Stripe webhook confirms.
  A pending booking holds capacity for ~10 minutes; expire it with a
  scheduled job if not paid.
- Refunds re-credit the slot.

## Email touchpoints (via Resend)

- Booking confirmation (immediately after `paid`)
- Reminder 24h before tour
- Day-of "see you at the meeting point" with map link
- Post-tour review request (4h after end)

## Account page integration

- `/account/bookings` lists upcoming + past
- Each booking row links to its detail page
- Cancel button: triggers refund flow if within policy window

## Performance notes

- Tour list page caches with `revalidate: 60` (tours don't change every minute)
- Availability calendar is per-tour; do NOT prefetch availability for all tours
- Use Postgres `tstzrange` for slot ranges if exclusion-constraint
  conflicts become a problem at scale
