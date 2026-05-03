import "server-only";

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email/send-booking-confirmation";

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "checkout.session.expired":
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case "charge.refunded":
      await handleRefund(event.data.object as Stripe.Charge);
      break;
    case "charge.dispute.created":
      await handleDispute(event.data.object as Stripe.Dispute);
      break;
    default:
      // Unhandled event type — ignore
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.client_reference_id;
  if (!bookingId) return;

  const admin = createAdminClient();

  const { error } = await admin
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      receipt_url: null, // populated from charge.succeeded or Stripe receipt
    })
    .eq("id", bookingId);

  if (error) {
    console.error("[webhook] booking update failed:", error.message);
    throw new Error(`booking update failed: ${error.message}`);
  }

  // Send confirmation email
  await sendBookingConfirmation(bookingId).catch((err) => {
    // Non-fatal — log but don't fail the webhook
    console.error("[webhook] confirmation email failed:", err);
  });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.client_reference_id;
  if (!bookingId) return;

  const admin = createAdminClient();
  // Reset back to draft so user can try again
  await admin
    .from("bookings")
    .update({ status: "draft" })
    .eq("id", bookingId)
    .eq("stripe_session_id", session.id);
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const admin = createAdminClient();
  // Find booking by payment intent ID
  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();
  if (!data) return;

  // Keep in pending_payment — user can retry
  await admin
    .from("bookings")
    .update({ stripe_payment_intent_id: pi.id })
    .eq("id", (data as { id: string }).id);
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;
  const piId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent.id;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();
  if (!data) return;

  const bookingId = (data as { id: string }).id;
  await admin
    .from("bookings")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", bookingId);

  // Mark all booking_addons as refunded
  await admin
    .from("booking_addons")
    .update({ fulfillment_status: "refunded" })
    .eq("booking_id", bookingId);
}

async function handleDispute(dispute: Stripe.Dispute) {
  if (!dispute.payment_intent) return;
  const piId =
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : (dispute.payment_intent as { id: string }).id;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();
  if (!data) return;

  // Log dispute — admin will handle in Stripe Dashboard
  console.warn(
    "[webhook] dispute created for booking",
    (data as { id: string }).id,
    "dispute",
    dispute.id,
  );
}
