"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics/track";

export async function createBooking(formData: FormData) {
  const tour_id = formData.get("tour_id")?.toString() ?? "";
  const layover_id = formData.get("layover_id")?.toString() || null;

  if (!tour_id) redirect("/?error=missing_tour");

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const supabase = createAdminClient();

  const { data: tour, error: tourErr } = await supabase
    .from("tours")
    .select("id, city_id, price_cents, currency, duration_hours")
    .eq("id", tour_id)
    .maybeSingle();

  if (tourErr || !tour) redirect("/?error=tour_not_found");

  let partySize = 1;
  let pickupAt: string;
  let dropoffAt: string;

  if (layover_id) {
    const { data: layover, error: layoverErr } = await supabase
      .from("layovers")
      .select("party_size, flight_in_at, flight_out_at")
      .eq("id", layover_id)
      .maybeSingle();

    if (layoverErr || !layover) redirect("/?error=layover_not_found");

    partySize = layover.party_size;
    const inDate = new Date(layover.flight_in_at);
    inDate.setMinutes(inDate.getMinutes() + 60);
    pickupAt = inDate.toISOString();
    const durationMs = (tour.duration_hours ?? 3) * 60 * 60 * 1000;
    dropoffAt = new Date(inDate.getTime() + durationMs).toISOString();
  } else {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    pickupAt = now.toISOString();
    dropoffAt = new Date(now.getTime() + (tour.duration_hours ?? 3) * 60 * 60 * 1000).toISOString();
  }

  const baseCents = (tour.price_cents ?? 0) * partySize;

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
      total_cents: baseCents,
      currency: tour.currency ?? "EUR",
      status: "pending_payment",
    })
    .select("id")
    .single();

  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);

  track("booking_created", {
    booking_id: booking.id,
    tour_id,
    layover_id,
    party_size: partySize,
    total_cents: baseCents,
  }, { user_id: user.id, city_id: tour.city_id as string });

  redirect(`/booking/${booking.id}`);
}
