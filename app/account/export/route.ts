import { createClient } from "@/lib/supabase/server";

/**
 * GET /account/export — GDPR Art. 20 data portability.
 * Returns a JSON bundle of every entity tied to the authenticated user.
 * Add new entities here as they ship in future phases.
 */
export async function GET() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uid = user.id;

  const [profileRes, bookingsRes, layoversRes, reviewsRes, souvenirsRes, eventsRes] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, email, full_name, phone, nationality, preferred_language, marketing_opt_in, is_verified, gdpr_accepted_at, created_at")
        .eq("id", uid)
        .maybeSingle(),

      supabase
        .from("bookings")
        .select("id, tour_id, layover_id, party_size, scheduled_pickup_at, scheduled_dropoff_at, total_cents, currency, status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),

      supabase
        .from("layovers")
        .select("id, city_id, flight_in_at, flight_out_at, arrival_flight, departure_flight, party_size, has_checked_bags, status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),

      supabase
        .from("reviews")
        .select("id, booking_id, rating, body, created_at")
        .in(
          "booking_id",
          (
            await supabase
              .from("bookings")
              .select("id")
              .eq("user_id", uid)
          ).data?.map((b) => b.id) ?? [],
        ),

      supabase
        .from("souvenirs")
        .select("id, booking_id, gps_trace, photo_refs, ai_text, pdf_url, created_at")
        .in(
          "booking_id",
          (
            await supabase
              .from("bookings")
              .select("id")
              .eq("user_id", uid)
          ).data?.map((b) => b.id) ?? [],
        ),

      supabase
        .from("analytics_events")
        .select("id, event_name, props, url, locale, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  const bundle = {
    exported_at: new Date().toISOString(),
    user: profileRes.data ?? null,
    bookings: bookingsRes.data ?? [],
    layovers: layoversRes.data ?? [],
    reviews: reviewsRes.data ?? [],
    souvenirs: souvenirsRes.data ?? [],
    account_events: eventsRes.data ?? [],
  };

  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="layover-legends-export-${uid}.json"`,
    },
  });
}
