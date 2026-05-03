import Stripe from "stripe";

// Lazy singleton — instantiated on first call so build succeeds without keys set.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY env var is not set");
    _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}

/** Map our 8 app locales to Stripe Checkout locales. */
export const STRIPE_LOCALE: Record<string, string> = {
  en: "en",
  fr: "fr",
  nl: "nl",
  de: "de",
  es: "es",
  it: "it",
  pt: "pt",
  zh: "zh",
};
