import type { FxRate } from "@/lib/currency/types";

/**
 * Convert EUR cents to a display string in the visitor's currency.
 * Stripe ALWAYS charges in EUR — this is display-only.
 *
 * @param eurCents  Amount in EUR cents (BIGINT from DB)
 * @param rate      FxRate row for the target currency
 * @param locale    BCP-47 locale for number formatting (default nl-NL)
 */
export function formatPrice(
  eurCents: number,
  rate: FxRate,
  locale = "nl-NL"
): string {
  const eurAmount    = eurCents / 100;
  const localAmount  = rate.currency_code === "EUR"
    ? eurAmount
    : eurAmount * rate.rate_to_eur;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: rate.decimals,
    maximumFractionDigits: rate.decimals,
  }).format(localAmount);

  return rate.symbol_position === "before"
    ? `${rate.symbol}${formatted}`
    : `${formatted} ${rate.symbol.trim()}`;
}

/**
 * Format EUR amount directly (no conversion) — for admin + confirmations.
 */
export function formatEur(eurCents: number, locale = "nl-NL"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eurCents / 100);
}

/**
 * Checkout disclosure string.
 * "Charged in EUR €X.XX by Stripe. Your bank may apply FX fees."
 */
export function checkoutDisclosure(eurCents: number): string {
  return `Charged in EUR ${formatEur(eurCents)} by Stripe. Your bank may apply FX fees.`;
}

/** Parse currency cookie or default. */
export const CURRENCY_COOKIE = "pref_currency";
export const DEFAULT_CURRENCY = "EUR";

export function parseCurrencyCookie(cookieValue: string | undefined): string {
  if (!cookieValue) return DEFAULT_CURRENCY;
  const code = cookieValue.trim().toUpperCase();
  // Basic validation — must be 3 uppercase letters
  return /^[A-Z]{3}$/.test(code) ? code : DEFAULT_CURRENCY;
}
