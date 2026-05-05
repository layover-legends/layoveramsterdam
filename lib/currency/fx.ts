import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Re-export from client-safe types module
export type { FxRate } from "@/lib/currency/types";
import type { FxRate } from "@/lib/currency/types";

/** Country code → preferred currency (ISO-4217). Covers most visitor origins. */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", AU: "AUD", GB: "GBP",
  JP: "JPY", CN: "CNY", CH: "CHF",
  NO: "NOK", SE: "SEK", DK: "DKK",
  // All EU/eurozone countries → EUR (default)
};

/** Map a Vercel geo country code to the best display currency. */
export function countryToCurrency(countryCode: string | null | undefined): string {
  if (!countryCode) return "EUR";
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? "EUR";
}

let _cache: Map<string, FxRate> | null = null;
let _cacheAt = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in-process cache

/** Load all active FX rates (cached 1h). */
export async function getAllRates(): Promise<Map<string, FxRate>> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  const supabase = createClient();
  const { data } = await supabase
    .from("fx_rates")
    .select("currency_code, rate_to_eur, symbol, symbol_position, decimals")
    .eq("is_active", true);

  const map = new Map<string, FxRate>();
  for (const row of (data ?? []) as FxRate[]) {
    map.set(row.currency_code, row);
  }
  _cache = map;
  _cacheAt = Date.now();
  return map;
}

/** Get a single FX rate. Falls back to EUR (rate 1.0) if not found. */
/** All rates as a sorted array (for CurrencyPicker dropdown). */
export async function getAllRatesList(): Promise<FxRate[]> {
  const map = await getAllRates();
  const order = ["EUR","USD","GBP","CAD","AUD","JPY","CHF","CNY","NOK","SEK","DKK"];
  return order.map((code) => map.get(code)).filter((r): r is FxRate => !!r);
}

export async function getRate(currencyCode: string): Promise<FxRate> {
  const rates = await getAllRates();
  return rates.get(currencyCode) ?? {
    currency_code: "EUR",
    rate_to_eur: 1.0,
    symbol: "€",
    symbol_position: "before",
    decimals: 2,
  };
}

/** Refresh FX rates from exchangerate.host. Called by daily cron. */
export async function refreshFxRates(): Promise<{ updated: number; error?: string }> {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=EUR", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const json = await res.json() as { rates: Record<string, number>; success?: boolean };
    if (!json.rates) throw new Error("No rates in response");

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Only update currencies we already have in the DB (don't add new ones automatically)
    const { data: existing } = await admin.from("fx_rates").select("currency_code");
    const codes = new Set((existing ?? []).map((r: { currency_code: string }) => r.currency_code));

    const updates: { currency_code: string; rate_to_eur: number; fetched_at: string }[] = [];
    for (const [code, rate] of Object.entries(json.rates)) {
      if (codes.has(code) && code !== "EUR" && rate > 0) {
        updates.push({ currency_code: code, rate_to_eur: rate, fetched_at: now });
      }
    }

    for (const u of updates) {
      await admin.from("fx_rates")
        .update({ rate_to_eur: u.rate_to_eur, fetched_at: u.fetched_at })
        .eq("currency_code", u.currency_code);
    }

    // Invalidate in-process cache
    _cache = null;

    await admin.from("audit_logs").insert({
      event_type: "fx_rates_refreshed",
      payload: { updated: updates.length, timestamp: now },
    });

    return { updated: updates.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[fx-rates] refresh failed:", msg);
    // NEVER zero out rates on failure — just return the error
    return { updated: 0, error: msg };
  }
}
