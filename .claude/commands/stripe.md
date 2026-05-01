---
description: Wire Stripe end-to-end (Phase 2 monetization)
---

# Stripe integration: $ARGUMENTS

Phase 2 of the business. We charge customers for **bookable** destinations
and tour packages while keeping the free catalogue as the trojan horse.
This is real money — every step has to be production-grade.

## 1. Setup (one-time)

- Create Stripe account, switch to live mode only after sandbox testing
- Add to Vercel env (NOT marked Sensitive for `NEXT_PUBLIC_*`):
  - `STRIPE_SECRET_KEY` (server only; mark Sensitive)
  - `STRIPE_WEBHOOK_SECRET` (server only; mark Sensitive)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `npm install stripe @stripe/stripe-js`
- Restrict the publishable key to our domains in Stripe dashboard

## 2. Database

```sql
-- Add Stripe linkage to users (likely already there)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- New tables
CREATE TABLE IF NOT EXISTS public.bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id             UUID NOT NULL REFERENCES public.tours(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','paid','cancelled','refunded','completed')),
  starts_at           TIMESTAMPTZ NOT NULL,
  party_size          INT NOT NULL CHECK (party_size > 0),
  amount_cents        INT NOT NULL CHECK (amount_cents >= 0),
  currency            TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_id   TEXT UNIQUE,
  stripe_checkout_id  TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bookings_user_idx   ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_tour_idx   ON public.bookings (tour_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);

-- RLS: each user sees own bookings, admins see all
-- (use the standard policy patterns from /migrate)
```

## 3. Server module

```ts
// lib/stripe/server.ts (server-only)
import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY missing");
    _stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}
```

## 4. Checkout flow

- `/api/checkout` route handler: takes `tour_id`, `starts_at`, `party_size`,
  validates server-side (date in future, party size within capacity, tour
  exists and is active), creates Stripe Checkout Session with:
  - `mode: "payment"`
  - `customer_email` from session user
  - `client_reference_id` = the tentative booking row id
  - `success_url` and `cancel_url` to our pages
  - `metadata.booking_id` for webhook correlation
- Insert a `pending` row in `bookings` first; redirect to Stripe.

## 5. Webhook (`/api/stripe/webhook`)

- **Verify signature** with `stripe.webhooks.constructEvent` and the
  webhook secret. Without verification, anyone can spoof completion.
- Use Stripe's **idempotency key** on inbound: store `event.id`s in a
  `stripe_events` table and skip if seen.
- Events to handle:
  - `checkout.session.completed` → flip booking to `paid`, set
    `stripe_payment_id`, send confirmation email via Resend
  - `payment_intent.payment_failed` → mark `cancelled`, notify user
  - `charge.refunded` → mark `refunded`
- Webhook must respond 200 quickly; long work goes to a background job.

## 6. Checkout UX

- Show `Stripe Elements` is overkill for v1 — Checkout-redirect is faster.
- Display final price including taxes (currency: EUR; tax rate via Stripe
  Tax if we enable it).
- Always pass `automatic_tax: { enabled: true }` once tax IDs are set.

## 7. Refunds

- Admin-only server action `refundBooking(id)`:
  - Look up booking, call `stripe.refunds.create({ payment_intent })`
  - On success, flip status to `refunded`
  - Log the actor (`admin_id`) into an audit table

## 8. Reporting

- Sums by month/quarter via SQL views
- Reconcile with Stripe dashboard daily until volumes stabilize

## 9. Testing checklist

- [ ] Test with Stripe test cards (`4242…`, `4000 0000 0000 0002`)
- [ ] Webhook signature verified (forge an event → must 400)
- [ ] Concurrent purchases of last seat: row-level lock or capacity check
- [ ] Refund flow round-trips through webhook to status
- [ ] Failed payment doesn't leave a `paid` row

## Hard rules

- **Never log full card data, never store PAN.** Stripe handles that.
- **Never accept the success URL as proof of payment.** Webhook is truth.
- **Use idempotency keys on every charge create** so retries don't double-charge.
- **Test in test mode until everything is green.** No "let's test in prod for a week".
