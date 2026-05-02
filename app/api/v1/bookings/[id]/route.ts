import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonOk, jsonErr } from "@/lib/api/response";

/** GET /api/v1/bookings/:id — retrieve the authenticated owner's booking. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Authentication required.", 401);

  const { data, error } = await supabase
    .from("bookings")
    .select("id, tour_id, layover_id, party_size, scheduled_pickup_at, scheduled_dropoff_at, base_cents, addons_cents, total_cents, currency, status, created_at, tours(name, slug)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return jsonErr(error.message, 500);
  if (!data) return jsonErr("Booking not found.", 404);

  return jsonOk(data);
}
