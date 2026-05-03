import "server-only";

import { getStripe, STRIPE_LOCALE } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CheckoutPayload } from "./types";

export async function createCheckoutSession(
  payload: CheckoutPayload,
): Promise<{ sessionId: string; url: string }> {
  const { bookingId, locale, successUrl, cancelUrl, userEmail } = payload;
  const admin = createAdminClient();

  // Load booking
  const { data: rawBooking } = await admin
    .from("bookings")
    .select(
      "id, tour_id, party_size, base_cents, addons_cents, total_cents, currency, status, booking_addons(addon_id, qty, unit_price_cents, vat_rate)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!rawBooking) throw new Error("Booking not found");

  type BookingRow = {
    id: string;
    tour_id: string | null;
    party_size: number;
    base_cents: number;
    addons_cents: number;
    total_cents: number;
    currency: string;
    status: string;
    booking_addons: Array<{
      addon_id: string;
      qty: number;
      unit_price_cents: number;
      vat_rate: number;
    }>;
  };

  const booking = rawBooking as unknown as BookingRow;

  type LineItem = {
    price_data: {
      currency: string;
      product: string;
      unit_amount: number;
      tax_behavior: "inclusive";
    };
    quantity: number;
  };

  const lineItems: LineItem[] = [];

  // Tour line item
  if (booking.tour_id && booking.base_cents > 0) {
    const { data: tour } = await admin
      .from("tours")
      .select("name, stripe_product_id, pricing_model, price_cents")
      .eq("id", booking.tour_id)
      .maybeSingle();

    const t = tour as {
      name: string;
      stripe_product_id: string | null;
      pricing_model: string;
      price_cents: number;
    } | null;

    if (!t?.stripe_product_id) {
      throw new Error(`Tour is not synced to Stripe — run sync first`);
    }

    lineItems.push({
      price_data: {
        currency: "eur",
        product: t.stripe_product_id,
        unit_amount: t.price_cents,
        tax_behavior: "inclusive",
      },
      quantity: t.pricing_model === "per_person" ? booking.party_size : 1,
    });
  }

  // Add-on line items (use snapshotted unit_price_cents)
  if (booking.booking_addons.length > 0) {
    const addonIds = booking.booking_addons.map((ba) => ba.addon_id);
    const { data: addons } = await admin
      .from("addons")
      .select("id, stripe_product_id")
      .in("id", addonIds);

    const addonProductMap = new Map(
      ((addons ?? []) as { id: string; stripe_product_id: string | null }[]).map((a) => [
        a.id,
        a.stripe_product_id,
      ]),
    );

    for (const ba of booking.booking_addons) {
      const productId = addonProductMap.get(ba.addon_id);
      if (!productId) {
        throw new Error(`Add-on ${ba.addon_id} is not synced to Stripe — run sync first`);
      }
      lineItems.push({
        price_data: {
          currency: "eur",
          product: productId,
          unit_amount: ba.unit_price_cents, // snapshotted price
          tax_behavior: "inclusive",
        },
        quantity: ba.qty,
      });
    }
  }

  if (lineItems.length === 0) {
    throw new Error("No line items for checkout");
  }

  // Create Stripe Checkout session
  const stripeLocale = (STRIPE_LOCALE[locale] ?? "en") as "auto";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "ideal"],
    automatic_tax: { enabled: true },
    line_items: lineItems,
    client_reference_id: bookingId,
    customer_email: userEmail ?? undefined,
    locale: stripeLocale,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { booking_id: bookingId },
  });

  if (!session.url) throw new Error("Stripe did not return a session URL");

  // Mark booking as pending_payment + store session ID
  await admin
    .from("bookings")
    .update({
      status: "pending_payment",
      stripe_session_id: session.id,
    })
    .eq("id", bookingId);

  return { sessionId: session.id, url: session.url };
}
