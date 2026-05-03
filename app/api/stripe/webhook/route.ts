import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { handleStripeEvent } from "@/lib/stripe/webhook";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

// Must read raw body for signature verification — disable body parsing
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[webhook] signature verification failed:", message);
    return new NextResponse(`Webhook signature failed: ${message}`, { status: 400 });
  }

  const admin = createAdminClient();

  // Dedup — Stripe retries on non-200, so we must handle replays
  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existing) {
    return new NextResponse("Already processed", { status: 200 });
  }

  // Record event first (so a crash mid-processing won't re-run on retry)
  await admin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    payload: event.data.object as object,
  });

  // Process
  try {
    await handleStripeEvent(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[webhook] handler error:", event.type, message);
    // Update event row with error
    await admin
      .from("stripe_events")
      .update({ processing_error: message })
      .eq("id", event.id);
    // Return 500 so Stripe retries — the dedup above prevents double-processing
    return new NextResponse(`Handler error: ${message}`, { status: 500 });
  }

  return new NextResponse("ok", { status: 200 });
}
