import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PublicBooking = {
  id: string;
  tour_id: string;
  tour_name: string;
  tour_slug: string;
  party_size: number;
  scheduled_pickup_at: string;
  scheduled_dropoff_at: string;
  total_cents: number;
  currency: string;
  status: string;
  user_id: string | null;
};

export async function getBookingForUser(
  bookingId: string,
  userId: string,
): Promise<PublicBooking | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("id, tour_id, party_size, scheduled_pickup_at, scheduled_dropoff_at, total_cents, currency, status, user_id, tours(name, slug)")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const tour = data.tours as unknown as { name: string; slug: string } | null;

  return {
    id: data.id,
    tour_id: data.tour_id,
    tour_name: tour?.name ?? "Tour",
    tour_slug: tour?.slug ?? "",
    party_size: data.party_size,
    scheduled_pickup_at: data.scheduled_pickup_at,
    scheduled_dropoff_at: data.scheduled_dropoff_at,
    total_cents: data.total_cents,
    currency: data.currency,
    status: data.status,
    user_id: data.user_id,
  };
}
