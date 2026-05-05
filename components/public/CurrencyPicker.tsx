"use client";

/**
 * CurrencyPicker — server-side price rendering, no client flash.
 *
 * The parent server component resolves all FX rates and the current currency
 * from the cookie, then passes them as props. On change, the form submits
 * to a server action that sets the cookie and revalidates the layout,
 * causing all prices on the page to re-render in the new currency.
 */

import { useTransition } from "react";
import { setCurrency } from "@/app/actions/currency";
import type { FxRate } from "@/lib/currency/types";

// Flag emoji map — covers the currencies in our fx_rates seed
const FLAG: Record<string, string> = {
  EUR: "🇪🇺", USD: "🇺🇸", GBP: "🇬🇧", CAD: "🇨🇦",
  AUD: "🇦🇺", JPY: "🇯🇵", CHF: "🇨🇭", CNY: "🇨🇳",
  NOK: "🇳🇴", SEK: "🇸🇪", DKK: "🇩🇰",
};

const CURRENCY_NAME: Record<string, string> = {
  EUR: "Euro", USD: "US Dollar", GBP: "British Pound", CAD: "Canadian Dollar",
  AUD: "Australian Dollar", JPY: "Japanese Yen", CHF: "Swiss Franc",
  CNY: "Chinese Yuan", NOK: "Norwegian Krone", SEK: "Swedish Krona", DKK: "Danish Krone",
};

type Props = {
  rates:           FxRate[];
  currentCurrency: string;
  compact?:        boolean; // true = just code, false = flag + code
};

export default function CurrencyPicker({ rates, currentCurrency, compact = false }: Props) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.set("currency", e.target.value);
    startTransition(() => { setCurrency(fd); });
  }

  return (
    <form>
      <label htmlFor="currency-select" className="sr-only">Select currency</label>
      <select
        id="currency-select"
        name="currency"
        value={currentCurrency}
        onChange={handleChange}
        disabled={pending}
        aria-label="Select display currency"
        className="bg-transparent text-warm-cream/60 text-xs hover:text-warm-cream/90 cursor-pointer focus:outline-none focus:ring-1 focus:ring-legend-gold/40 rounded transition-colors disabled:opacity-50"
        style={{ backgroundColor: "transparent" }}
      >
        {rates.map((r) => (
          <option
            key={r.currency_code}
            value={r.currency_code}
            style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}
          >
            {compact
              ? `${FLAG[r.currency_code] ?? ""} ${r.currency_code}`
              : `${FLAG[r.currency_code] ?? ""} ${r.currency_code} ${r.symbol.trim()} — ${CURRENCY_NAME[r.currency_code] ?? r.currency_code}`
            }
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-warm-cream/30 ml-1">…</span>}
    </form>
  );
}
