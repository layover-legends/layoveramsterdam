"use client";

type Props = {
  used: number;
  limit: number;
  unit?: string;
  warnAt?: number;  // pct (0-100)
  critAt?: number;  // pct (0-100)
  label?: string;
};

export default function QuotaBar({
  used,
  limit,
  unit,
  warnAt = 70,
  critAt = 90,
  label,
}: Props) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isCrit = pct >= critAt;
  const isWarn = !isCrit && pct >= warnAt;

  const barColor = isCrit
    ? "bg-red-500"
    : isWarn
    ? "bg-amber-400"
    : "bg-legend-gold";

  const textColor = isCrit ? "text-red-400" : isWarn ? "text-amber-300" : "text-warm-cream/60";

  function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  }

  return (
    <div className="space-y-1">
      {label && <p className="text-[10px] text-warm-cream/40 uppercase tracking-wider">{label}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-warm-cream/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[11px] font-mono tabular-nums shrink-0 ${textColor}`}>
          {pct.toFixed(pct < 10 ? 1 : 0)}%
        </span>
      </div>
      <p className="text-[10px] text-warm-cream/35 font-mono">
        {fmt(used)} / {fmt(limit)} {unit ?? ""}
      </p>
    </div>
  );
}
