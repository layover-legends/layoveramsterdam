"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/analytics/track";

export async function cancelBooking(bookingId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, status, tour_id, total_cents, currency, city_id")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !booking) redirect("/?error=booking_not_found");

  if (!["pending_payment", "confirmed"].includes(booking.status)) {
    redirect(`/booking/${bookingId}?error=cannot_cancel`);
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: "User cancelled",
    })
    .eq("id", bookingId)
    .eq("user_id", user.id);

  if (error) redirect(`/booking/${bookingId}?error=${encodeURIComponent(error.message)}`);

  track("booking_cancelled", {
    booking_id: bookingId,
    tour_id: booking.tour_id,
    total_cents: booking.total_cents,
    currency: booking.currency,
  }, { user_id: user.id, city_id: booking.city_id as string });

  revalidatePath(`/booking/${bookingId}`);
  redirect(`/booking/${bookingId}?cancelled=1`);
}
