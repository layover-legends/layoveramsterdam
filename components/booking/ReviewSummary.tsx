import { formatPrice } from "@/lib/i18n/format-price";
import { t } from "@/lib/i18n/t";

type AddonLine = {
  name: string;
  qty: number;
  unit_price_cents: number;
  vat_rate: number;
};

type Props = {
  tourName: string | null;
  partySize: number;
  baseCents: number;
  currency: string;
  addonLines: AddonLine[];
  labels: Record<string, string>;
};

export default function ReviewSummary({
  tourName,
  partySize,
  baseCents,
  currency,
  addonLines,
  labels,
}: Props) {
  const addonsCents = addonLines.reduce((s, a) => s + a.unit_price_cents * a.qty, 0);
  const totalCents = baseCents + addonsCents;

  // VAT extraction per line (VAT-inclusive pricing)
  const tourVatCents = baseCents > 0 ? Math.round(baseCents - baseCents / 1.21) : 0;
  const addonVatCents = addonLines.reduce((s, a) => {
    const lineCents = a.unit_price_cents * a.qty;
    return s + Math.round(lineCents - lineCents / (1 + a.vat_rate));
  }, 0);
  const totalVatCents = tourVatCents + addonVatCents;

  return (
    <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.04] p-6 space-y-3">
      {/* Tour */}
      {tourName && baseCents > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-warm-cream/60">
            {t(labels, "checkout.review.tour", "Tour")}: {tourName}
            {partySize > 1 && (
              <span className="text-warm-cream/40 text-xs"> × {partySize}</span>
            )}
          </span>
          <span className="font-mono text-warm-cream">{formatPrice(baseCents, currency)}</span>
        </div>
      )}

      {/* Add-on lines */}
      {addonLines.map((line, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-warm-cream/60">
            + {line.name}
            {line.qty > 1 && (
              <span className="text-warm-cream/40 text-xs"> × {line.qty}</span>
            )}
          </span>
          <span className="font-mono text-warm-cream">
            {formatPrice(line.unit_price_cents * line.qty, currency)}
          </span>
        </div>
      ))}

      <div className="border-t border-warm-cream/10" />

      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-warm-cream/50">{t(labels, "checkout.review.subtotal", "Subtotal")}</span>
        <span className="font-mono text-warm-cream">{formatPrice(totalCents, currency)}</span>
      </div>

      {/* VAT (displayed for info — Stripe automatic_tax is authoritative on invoice) */}
      <div className="flex justify-between text-xs">
        <span className="text-warm-cream/35">{t(labels, "checkout.review.vat", "VAT (incl.)")}</span>
        <span className="font-mono text-warm-cream/35">{formatPrice(totalVatCents, currency)}</span>
      </div>

      <div className="border-t border-warm-cream/10 pt-2 flex justify-between">
        <span className="font-semibold text-warm-cream">{t(labels, "checkout.review.total", "Total")}</span>
        <span className="font-display font-semibold text-legend-gold text-xl">
          {formatPrice(totalCents, currency)}
        </span>
      </div>
    </div>
  );
}
