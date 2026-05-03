import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RATE_LIMIT_HOURS = 24;

/**
 * GET /account/export — GDPR Art. 20 data portability.
 * Returns a JSON bundle of every entity tied to the authenticated user.
 * Rate-limited to 1 export per 24 hours. Logged to audit_logs.
 */
export async function GET(request: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uid = user.id;
  const admin = createAdminClient();

  // ── Rate-limit check ───────────────────��────────────────────────────────────
  const { data: rateRow } = await admin
    .from("export_rate_limits")
    .select("last_export")
    .eq("user_id", uid)
    .maybeSingle();

  if (rateRow?.last_export) {
    const lastExport = new Date(rateRow.last_export as string);
    const hoursSince = (Date.now() - lastExport.getTime()) / (1000 * 60 * 60);
    if (hoursSince < RATE_LIMIT_HOURS) {
      const retryAfter = Math.ceil(RATE_LIMIT_HOURS - hoursSince);
      return new Response(
        JSON.stringify({ error: `Export rate limited. Try again in ${retryAfter}h.` }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter * 3600),
          },
        }
      );
    }
  }

  // ── Fetch all user data ───────────────────────────���─────────────────────────
  const uid2 = uid; // avoid closure capture issues in nested await

  const bookingIds = await admin
    .from("bookings")
    .select("id")
    .eq("user_id", uid2);
  const bids = (bookingIds.data ?? []).map((b: { id: string }) => b.id);

  const [
    profileRes,
    bookingsRes,
    layoversRes,
    customRoutesRes,
    serviceInterestRes,
    reviewsRes,
    souvenirsRes,
    eventsRes,
  ] = await Promise.all([
    admin
      .from("users")
      .select(
        "id, email, full_name, phone, nationality, preferred_language, marketing_opt_in, is_verified, gdpr_accepted_at, created_at, updated_at",
      )
      .eq("id", uid2)
      .maybeSingle(),

    admin
      .from("bookings")
      .select(
        "id, tour_id, layover_id, party_size, scheduled_pickup_at, scheduled_dropoff_at, total_cents, currency, status, created_at",
      )
      .eq("user_id", uid2)
      .order("created_at", { ascending: false }),

    admin
      .from("layovers")
      .select(
        "id, city_id, flight_in_at, flight_out_at, arrival_flight, departure_flight, party_size, has_checked_bags, status, created_at",
      )
      .eq("user_id", uid2)
      .order("created_at", { ascending: false }),

    admin
      .from("custom_routes")
      .select("id, stop_ids, geometry_json, created_at, updated_at")
      .eq("user_id", uid2)
      .order("created_at", { ascending: false }),

    admin
      .from("service_interest")
      .select("id, service_id, email, created_at")
      .eq("email", user.email ?? ""),

    bids.length > 0
      ? admin
          .from("reviews")
          .select("id, booking_id, rating, body, created_at")
          .in("booking_id", bids)
      : Promise.resolve({ data: [] }),

    bids.length > 0
      ? admin
          .from("souvenirs")
          .select("id, booking_id, gps_trace, photo_refs, ai_text, pdf_url, created_at")
          .in("booking_id", bids)
      : Promise.resolve({ data: [] }),

    admin
      .from("analytics_events")
      .select("id, event_name, props, url, locale, created_at")
      .eq("user_id", uid2)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const bundle = {
    exported_at: new Date().toISOString(),
    gdpr_reference: "GDPR Art. 20 — Right to data portability",
    user: profileRes.data ?? null,
    bookings: bookingsRes.data ?? [],
    layovers: layoversRes.data ?? [],
    custom_routes: customRoutesRes.data ?? [],
    service_interest: serviceInterestRes.data ?? [],
    reviews: reviewsRes.data ?? [],
    souvenirs: souvenirsRes.data ?? [],
    account_events: eventsRes.data ?? [],
  };

  // ── Upsert rate-limit row + write audit log ─────────────────────────────────
  const userAgent = request.headers.get("user-agent") ?? null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await Promise.all([
    admin
      .from("export_rate_limits")
      .upsert({ user_id: uid2, last_export: new Date().toISOString() }, { onConflict: "user_id" }),

    admin.from("audit_logs").insert({
      user_id: uid2,
      event_type: "data_export",
      payload: { exported_entities: Object.keys(bundle).filter((k) => k !== "exported_at" && k !== "gdpr_reference") },
      ip_address: ip,
      user_agent: userAgent,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="layover-legends-export-${uid2}-${today}.json"`,
    },
  });
}
