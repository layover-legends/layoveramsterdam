"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { resolveLocale } from "@/lib/i18n/resolve";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://layover-legends.com";

export async function startCheckout(
  bookingId: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthenticated" };

  const locale = resolveLocale();

  try {
    const { url } = await createCheckoutSession({
      bookingId,
      locale,
      successUrl: `${SITE}/booking/${bookingId}/success`,
      cancelUrl: `${SITE}/booking/${bookingId}/cancelled`,
      userEmail: user.email,
    });
    return { url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout session creation failed";
    console.error("[startCheckout]", message);
    return { error: message };
  }
}

/** Called from CheckoutButton — redirects directly to Stripe URL. */
export async function redirectToCheckout(bookingId: string): Promise<never> {
  const result = await startCheckout(bookingId);
  if ("error" in result) {
    redirect(`/booking/${bookingId}/review?error=${encodeURIComponent(result.error)}`);
  }
  redirect(result.url);
}
