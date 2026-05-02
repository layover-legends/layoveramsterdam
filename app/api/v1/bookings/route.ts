import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics/track";
import { jsonOk, jsonErr } from "@/lib/api/response";

/** POST /api/v1/bookings — create a booking (status=pending_payment). */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonErr("Invalid JSON body.", 400);
  }

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return jsonErr("Authentication required.", 401);

  const tour_id = typeof body.tour_id === "string" ? body.tour_id : null;
  const layover_id = typeof body.layover_id === "string" ? body.layover_id : null;

  if (!tour_id) return jsonErr("tour_id is required.", 422);

  const supabase = createAdminClient();

  const { data: tour, error: tourErr } = await supabase
    .from("tours")
    .select("id, city_id, price_cents, currency, duration_hours, max_group_size")
    .eq("id", tour_id)
    .maybeSingle();

  if (tourErr || !tour) return jsonErr("Tour not found.", 404);

  let partySize = 1;
  let pickupAt: string;
  let dropoffAt: string;

  if (layover_id) {
    const { data: layover, error: layoverErr } = await supabase
      .from("layovers")
      .select("party_size, flight_in_at, flight_out_at")
      .eq("id", layover_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (layoverErr || !layover) return jsonErr("Layover not found or not yours.", 404);
    partySize = layover.party_size;
    const inDate = new Date(layover.flight_in_at);
    inDate.setMinutes(inDate.getMinutes() + 60);
    pickupAt = inDate.toISOString();
    const durationMs = ((tour.duration_hours ?? 3) * 60 * 60 * 1000);
    dropoffAt = new Date(inDate.getTime() + durationMs).toISOString();
  } else {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    pickupAt = now.toISOString();
    dropoffAt = new Date(now.getTime() + (tour.duration_hours ?? 3) * 60 * 60 * 1000).toISOString();
  }

  const baseCents = (tour.price_cents ?? 0) * partySize;
  const totalCents = baseCents;

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      city_id: tour.city_id,
      tour_id,
      layover_id,
      party_size: partySize,
      scheduled_pickup_at: pickupAt,
      scheduled_dropoff_at: dropoffAt,
      base_cents: baseCents,
      addons_cents: 0,
      total_cents: totalCents,
      currency: tour.currency ?? "EUR",
      status: "pending_payment",
    })
    .select("id")
    .single();

  if (error) return jsonErr(error.message, 500);

  track("booking_created", {
    booking_id: booking.id,
    tour_id,
    layover_id,
    party_size: partySize,
    total_cents: totalCents,
    currency: tour.currency,
  }, { user_id: user.id, city_id: tour.city_id as string });

  return jsonOk({ id: booking.id }, 201);
}
