"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { track } from "@/lib/analytics/track";

export async function cancelBooking(bookingId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, status, tour_id, total_cents, currency, city_id, stripe_payment_intent_id")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !booking) redirect("/?error=booking_not_found");

  // Allow cancellation of pending, confirmed, or already-paid bookings
  if (!["pending_payment", "confirmed", "paid"].includes(booking.status)) {
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

  // MON-02: automatically trigger a Stripe refund when a paid booking is cancelled.
  // The charge.refunded webhook will flip the DB status to 'refunded'.
  const piId = (booking as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id;
  if (piId && booking.status === "paid") {
    try {
      await getStripe().refunds.create({
        payment_intent: piId,
        reason: "requested_by_customer",
      });
    } catch (err) {
      // Non-fatal: log and continue. The booking is already cancelled in the DB.
      // An admin can issue the refund manually from the Stripe Dashboard if needed.
      console.error("[cancelBooking] Stripe refund failed — manual refund may be required:", err);
    }
  }

  track("booking_cancelled", {
    booking_id: bookingId,
    tour_id: booking.tour_id,
    total_cents: booking.total_cents,
    currency: booking.currency,
  }, { user_id: user.id, city_id: booking.city_id as string });

  revalidatePath(`/booking/${bookingId}`);
  redirect(`/booking/${bookingId}?cancelled=1`);
}
