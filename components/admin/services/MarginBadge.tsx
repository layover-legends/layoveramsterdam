import { computeMargin } from "@/lib/admin/margin";

type Props = {
  price_cents: number;
  vat_rate: number;
  cogs_cents: number | null;
  pricing_model?: "flat" | "per_person";
};

export default function MarginBadge({ price_cents, vat_rate, cogs_cents, pricing_model }: Props) {
  const result = computeMargin({ price_cents, vat_rate, cogs_cents, pricing_model });

  if (!result) {
    return <span className="text-xs text-warm-cream/30">—</span>;
  }

  const { margin_pct, status } = result;

  const cls =
    status === "healthy"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
      : status === "thin"
        ? "bg-amber-400/15 text-amber-300 border-amber-400/25"
        : margin_pct < 0
          ? "bg-red-600/20 text-red-300 border-red-600/30"
          : "bg-red-500/15 text-red-400 border-red-500/25";

  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      {margin_pct >= 0 ? "+" : ""}
      {margin_pct.toFixed(0)}%
    </span>
  );
}
