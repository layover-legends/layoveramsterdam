"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────────────────────
// createPendingBooking
// ─────────────────────────────────────────────────────────────────────────────

type CreateParams = {
  tourSlug: string;
  partySize: number;
  addonSlugs: string[];
  userId: string;
};

type CreateResult = { bookingId: string } | { error: string };

export async function createPendingBooking({
  tourSlug,
  partySize,
  addonSlugs,
  userId,
}: CreateParams): Promise<CreateResult> {
  const admin = createAdminClient();

  // 1. Fetch tour
  const { data: rawTour } = await admin
    .from("tours")
    .select(
      "id, city_id, price_cents, currency, pricing_model, min_group_size, max_group_size, duration_hours, launch_mode, vat_rate",
    )
    .eq("slug", tourSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!rawTour) return { error: "tour_not_found" };

  const tour = rawTour as {
    id: string;
    city_id: string;
    price_cents: number;
    currency: string;
    pricing_model: string;
    min_group_size: number;
    max_group_size: number | null;
    duration_hours: number | null;
    launch_mode: boolean;
    vat_rate: number;
  };

  // 2. Validate party size (min check skipped when launch_mode = true)
  if (!tour.launch_mode && partySize < tour.min_group_size) {
    return { error: `min_party_${tour.min_group_size}` };
  }
  if (tour.max_group_size !== null && partySize > tour.max_group_size) {
    return { error: `max_party_${tour.max_group_size}` };
  }

  // 3. Fetch addon prices for snapshotting
  type AddonSnap = {
    id: string;
    slug: string;
    pricing_model: string;
    price_cents: number;
    vat_rate: number;
  };

  let addonRows: AddonSnap[] = [];
  if (addonSlugs.length > 0) {
    const { data } = await admin
      .from("addons")
      .select("id, slug, pricing_model, price_cents, vat_rate")
      .in("slug", addonSlugs)
      .eq("is_active", true);
    addonRows = (data ?? []) as AddonSnap[];
  }

  // 4. Compute totals
  const baseCents =
    tour.pricing_model === "per_person"
      ? tour.price_cents * partySize
      : tour.price_cents;

  let addonsCents = 0;
  for (const a of addonRows) {
    const qty = a.pricing_model === "per_person" ? partySize : 1;
    addonsCents += a.price_cents * qty;
  }

  // 5. Placeholder pickup/dropoff (Phase 8c will collect real times)
  const pickupAt = new Date(Date.now() + 60 * 60 * 1000);
  const dropoffAt = new Date(
    pickupAt.getTime() + (tour.duration_hours ?? 3) * 60 * 60 * 1000,
  );

  // 6. Insert booking
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .insert({
      user_id: userId,
      city_id: tour.city_id,
      tour_id: tour.id,
      party_size: partySize,
      scheduled_pickup_at: pickupAt.toISOString(),
      scheduled_dropoff_at: dropoffAt.toISOString(),
      base_cents: baseCents,
      addons_cents: addonsCents,
      total_cents: baseCents + addonsCents,
      currency: tour.currency ?? "EUR",
      status: "draft",
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    return { error: bookingErr?.message ?? "booking_insert_failed" };
  }

  // 7. Snapshot booking_addons
  if (addonRows.length > 0) {
    const inserts = addonRows.map((a) => ({
      booking_id: booking.id,
      addon_id: a.id,
      qty: a.pricing_model === "per_person" ? partySize : 1,
      unit_price_cents: a.price_cents,
      vat_rate: a.vat_rate,
    }));

    const { error: addonsErr } = await admin.from("booking_addons").insert(inserts);
    if (addonsErr) {
      console.error("[createPendingBooking] booking_addons insert failed:", addonsErr.message);
    }
  }

  return { bookingId: booking.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateBookingAddons
// Called from AddonStepClient when user clicks "Continue" or "Skip".
// Re-snapshots prices and recalculates booking totals.
// ─────────────────────────────────────────────────────────────────────────────

type UpdateResult = { ok: boolean; error?: string };

export async function updateBookingAddons(
  bookingId: string,
  addonSlugs: string[],
): Promise<UpdateResult> {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const admin = createAdminClient();

  const { data: rawBooking } = await admin
    .from("bookings")
    .select("id, user_id, party_size, base_cents, currency")
    .eq("id", bookingId)
    .maybeSingle();

  if (!rawBooking || (rawBooking as { user_id: string }).user_id !== user.id) {
    return { ok: false, error: "booking_not_found" };
  }

  const booking = rawBooking as {
    id: string;
    user_id: string;
    party_size: number;
    base_cents: number;
    currency: string;
  };

  // Fetch current addon prices
  type AddonSnap = {
    id: string;
    slug: string;
    pricing_model: string;
    price_cents: number;
    vat_rate: number;
  };

  let addonRows: AddonSnap[] = [];
  if (addonSlugs.length > 0) {
    const { data } = await admin
      .from("addons")
      .select("id, slug, pricing_model, price_cents, vat_rate")
      .in("slug", addonSlugs)
      .eq("is_active", true);
    addonRows = (data ?? []) as AddonSnap[];
  }

  // Delete old line items
  await admin.from("booking_addons").delete().eq("booking_id", bookingId);

  // Compute new totals and insert new line items
  let addonsCents = 0;
  if (addonRows.length > 0) {
    const inserts = addonRows.map((a) => {
      const qty = a.pricing_model === "per_person" ? booking.party_size : 1;
      addonsCents += a.price_cents * qty;
      return {
        booking_id: bookingId,
        addon_id: a.id,
        qty,
        unit_price_cents: a.price_cents,
        vat_rate: a.vat_rate,
      };
    });

    const { error } = await admin.from("booking_addons").insert(inserts);
    if (error) return { ok: false, error: error.message };
  }

  // Update booking totals (satisfies total_cents = base_cents + addons_cents CHECK)
  const { error: updateErr } = await admin
    .from("bookings")
    .update({
      addons_cents: addonsCents,
      total_cents: booking.base_cents + addonsCents,
    })
    .eq("id", bookingId);

  if (updateErr) return { ok: false, error: updateErr.message };

  return { ok: true };
}
