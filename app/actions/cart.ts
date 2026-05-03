"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AddToCartResult =
  | { bookingId: string }
  | { authRequired: true }
  | { error: string };

/**
 * Add a standalone service to the user's draft booking.
 * Creates a new draft booking with tour_id=NULL if none exists.
 * party_size defaults to 1 for solo standalone purchases.
 */
export async function addToCart(addonSlug: string): Promise<AddToCartResult> {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) return { authRequired: true };

  const admin = createAdminClient();

  // Fetch addon details for price snapshot
  const { data: rawAddon } = await admin
    .from("addons")
    .select("id, city_id, pricing_model, price_cents, vat_rate, availability_status, service_type")
    .eq("slug", addonSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!rawAddon) return { error: "addon_not_found" };

  const addon = rawAddon as {
    id: string;
    city_id: string;
    pricing_model: string;
    price_cents: number;
    vat_rate: number;
    availability_status: string;
    service_type: string;
  };

  if (addon.availability_status !== "active") return { error: "not_available" };

  // Look for an existing draft standalones-only booking for this user
  const { data: existingDraft } = await admin
    .from("bookings")
    .select("id, base_cents, addons_cents, party_size")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .is("tour_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const partySize = 1;
  const qty = addon.pricing_model === "per_person" ? partySize : 1;
  const lineCents = addon.price_cents * qty;

  let bookingId: string;

  if (existingDraft) {
    bookingId = existingDraft.id as string;
    const newAddonsCents = (existingDraft.addons_cents as number) + lineCents;
    const baseCents = existingDraft.base_cents as number;

    // Append addon to existing booking
    const { error: insertErr } = await admin.from("booking_addons").insert({
      booking_id: bookingId,
      addon_id: addon.id,
      qty,
      unit_price_cents: addon.price_cents,
      vat_rate: addon.vat_rate,
    });
    if (insertErr) return { error: insertErr.message };

    // Update totals
    const { error: updateErr } = await admin
      .from("bookings")
      .update({
        addons_cents: newAddonsCents,
        total_cents: baseCents + newAddonsCents,
      })
      .eq("id", bookingId);
    if (updateErr) return { error: updateErr.message };
  } else {
    // Create new standalones-only draft booking (tour_id = NULL)
    const pickupAt = new Date(Date.now() + 60 * 60 * 1000);
    const dropoffAt = new Date(pickupAt.getTime() + 4 * 60 * 60 * 1000);

    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .insert({
        user_id: user.id,
        city_id: addon.city_id,
        tour_id: null,
        party_size: partySize,
        scheduled_pickup_at: pickupAt.toISOString(),
        scheduled_dropoff_at: dropoffAt.toISOString(),
        base_cents: 0,
        addons_cents: lineCents,
        total_cents: lineCents,
        currency: "EUR",
        status: "draft",
      })
      .select("id")
      .single();

    if (bookingErr || !booking) return { error: bookingErr?.message ?? "booking_failed" };

    bookingId = booking.id;

    const { error: insertErr } = await admin.from("booking_addons").insert({
      booking_id: bookingId,
      addon_id: addon.id,
      qty,
      unit_price_cents: addon.price_cents,
      vat_rate: addon.vat_rate,
    });
    if (insertErr) return { error: insertErr.message };
  }

  return { bookingId };
}
