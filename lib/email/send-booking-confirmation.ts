import "server-only";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderBookingConfirmation } from "./templates/BookingConfirmation";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: rawBooking } = await admin
    .from("bookings")
    .select(
      "id, party_size, scheduled_pickup_at, total_cents, currency, receipt_url, confirmation_email_sent_at, tour_id, booking_addons(addon_id, qty, unit_price_cents, vat_rate), users(email)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!rawBooking) return;

  type BookingRow = {
    id: string;
    party_size: number;
    scheduled_pickup_at: string;
    total_cents: number;
    currency: string;
    receipt_url: string | null;
    confirmation_email_sent_at: string | null;
    tour_id: string | null;
    booking_addons: Array<{ addon_id: string; qty: number; unit_price_cents: number; vat_rate: number }>;
    users: { email: string } | null;
  };

  const booking = rawBooking as unknown as BookingRow;

  // Idempotent — don't send twice
  if (booking.confirmation_email_sent_at) return;

  const userEmail = booking.users?.email;
  if (!userEmail) return;

  // Get tour name
  let tourName: string | null = null;
  if (booking.tour_id) {
    const { data: tour } = await admin
      .from("tours")
      .select("name")
      .eq("id", booking.tour_id)
      .maybeSingle();
    tourName = (tour as { name: string } | null)?.name ?? null;
  }

  // Get addon names for line items
  const addonIds = booking.booking_addons.map((ba) => ba.addon_id);
  let addonNames = new Map<string, string>();
  if (addonIds.length > 0) {
    const { data: addons } = await admin
      .from("addons")
      .select("id, name")
      .in("id", addonIds);
    addonNames = new Map(
      ((addons ?? []) as { id: string; name: string | null }[]).map((a) => [a.id, a.name ?? a.id]),
    );
  }

  const addonLines = booking.booking_addons.map((ba) => ({
    name: addonNames.get(ba.addon_id) ?? "Add-on",
    total_cents: ba.unit_price_cents * ba.qty,
    currency: booking.currency,
  }));

  const { subject, html } = renderBookingConfirmation({
    bookingId: booking.id,
    tourName,
    partySize: booking.party_size,
    scheduledPickupAt: booking.scheduled_pickup_at,
    addonLines,
    totalCents: booking.total_cents,
    currency: booking.currency,
    receiptUrl: booking.receipt_url,
    userEmail,
  });

  await getResend().emails.send({
    from: "Layover Legends <bookings@layover-legends.com>",
    to: userEmail,
    subject,
    html,
  });

  // Mark sent
  await admin
    .from("bookings")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("id", bookingId);
}
