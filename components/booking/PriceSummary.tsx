import type { PublicAddon } from "@/lib/public/tour-addons";
import { formatPrice } from "@/lib/i18n/format-price";
import { t } from "@/lib/i18n/ui";

type Props = {
  tourName: string;
  baseCents: number;
  currency: string;
  partySize: number;
  selectedAddons: PublicAddon[];
  labels: Record<string, string>;
};

export default function PriceSummary({
  tourName,
  baseCents,
  currency,
  partySize,
  selectedAddons,
  labels,
}: Props) {
  type Line = { name: string; total: number; pricing_model: string; vat_rate: number };

  const addonLines: Line[] = selectedAddons.map((a) => ({
    name: a.name,
    total: a.pricing_model === "per_person" ? a.price_cents * partySize : a.price_cents,
    pricing_model: a.pricing_model,
    vat_rate: a.vat_rate,
  }));

  const addonsCents = addonLines.reduce((s, l) => s + l.total, 0);
  const totalCents = baseCents + addonsCents;

  // VAT is included in prices (Dutch VAT-inclusive). Extract per line.
  const tourVatCents = Math.round(baseCents - baseCents / 1.21);
  const addonVatCents = addonLines.reduce(
    (s, l) => s + Math.round(l.total - l.total / (1 + l.vat_rate)),
    0,
  );
  const totalVatCents = tourVatCents + addonVatCents;

  return (
    <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03] p-5 space-y-3">
      {/* Tour base */}
      <div className="flex justify-between text-sm">
        <span className="text-warm-cream/70">
          {t(labels, "booking.summary.tour", "Tour")}: {tourName}
        </span>
        <span className="font-mono text-warm-cream">{formatPrice(baseCents, currency)}</span>
      </div>

      {/* Add-on lines */}
      {addonLines.map((line, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-warm-cream/70">
            +{" "}
            {t(
              labels,
              line.pricing_model === "per_person"
                ? "booking.summary.addon_pp"
                : "booking.summary.addon",
              "Add-on",
            )}
            : {line.name}
          </span>
          <span className="font-mono text-warm-cream">{formatPrice(line.total, currency)}</span>
        </div>
      ))}

      <div className="border-t border-warm-cream/10" />

      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-warm-cream/60">
          {t(labels, "booking.summary.subtotal", "Subtotal")}
        </span>
        <span className="font-mono text-warm-cream">{formatPrice(totalCents, currency)}</span>
      </div>

      {/* VAT */}
      <div className="flex justify-between text-xs">
        <span className="text-warm-cream/40">{t(labels, "booking.summary.vat", "VAT (incl.)")}</span>
        <span className="font-mono text-warm-cream/40">{formatPrice(totalVatCents, currency)}</span>
      </div>

      {/* Total */}
      <div className="flex justify-between pt-2 border-t border-warm-cream/10">
        <span className="font-semibold text-warm-cream">
          {t(labels, "booking.summary.total", "Total")}
        </span>
        <span className="font-display font-semibold text-legend-gold text-xl">
          {formatPrice(totalCents, currency)}
        </span>
      </div>
    </div>
  );
}
