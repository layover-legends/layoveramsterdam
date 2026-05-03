export type MarginStatus = "healthy" | "thin" | "loss";

export type MarginResult = {
  net_cents: number;
  cogs_cents: number;
  margin_cents: number;
  margin_pct: number;
  status: MarginStatus;
};

/**
 * Compute margin for a service priced VAT-inclusive.
 * For per_person services, party_size defaults to 1 for display purposes.
 * Returns null when cogs_cents is null (e.g. tours without cost data).
 */
export function computeMargin(opts: {
  price_cents: number;
  vat_rate: number;
  cogs_cents: number | null;
  pricing_model?: "flat" | "per_person";
  party_size?: number;
}): MarginResult | null {
  const { price_cents, vat_rate, cogs_cents } = opts;
  if (cogs_cents === null) return null;

  // VAT-inclusive price → extract net revenue
  const net_cents = Math.round(price_cents / (1 + vat_rate));
  const margin_cents = net_cents - cogs_cents;
  const margin_pct = net_cents > 0 ? (margin_cents / net_cents) * 100 : 0;
  const status: MarginStatus =
    margin_pct >= 30 ? "healthy" : margin_pct >= 15 ? "thin" : "loss";

  return { net_cents, cogs_cents, margin_cents, margin_pct, status };
}
