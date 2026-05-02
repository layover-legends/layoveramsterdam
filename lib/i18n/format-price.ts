/**
 * Blueprint+ A5 — locale-aware price formatting.
 * Prices are stored as integer cents in EUR. Render with Intl.NumberFormat
 * so EU users see "€69" and US users see "€69" with the right decimal separator.
 *
 * @param cents  - Amount in smallest currency unit (null = free)
 * @param currency - ISO 4217 code, default "EUR"
 * @param locale  - BCP 47 locale string (e.g. "nl-NL", "en-US")
 */
export function formatPrice(
  cents: number | null,
  currency = "EUR",
  locale = "nl-NL",
): string {
  if (cents === null || cents === 0) return "Free";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
