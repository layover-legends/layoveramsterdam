"use client";

import type { BuilderStop, OptimizedRoute } from "@/lib/builder/types";
import type { BudgetResult } from "@/lib/builder/time-budget";
import { formatMinutes } from "@/lib/builder/time-budget";

const t = (l: Record<string, string>, k: string, fb: string) => l[k] ?? fb;

type Props = {
  orderedStops: BuilderStop[];
  route: OptimizedRoute;
  budget: BudgetResult;
  labels: Record<string, string>;
  onRemoveStop: (id: string) => void;
};

export default function RouteSummary({
  orderedStops,
  route,
  budget,
  labels,
  onRemoveStop,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Budget strip */}
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          !budget.fits
            ? "border-red-400/30 bg-red-400/5"
            : budget.warning
            ? "border-amber-400/30 bg-amber-400/5"
            : "border-legend-gold/20 bg-legend-gold/5"
        }`}
      >
        {budget.warning ? (
          <p className={`font-medium ${!budget.fits ? "text-red-300" : "text-amber-300"}`}>
            {budget.warning}
          </p>
        ) : (
          <p className="text-legend-gold font-medium">
            {t(labels, "public.builder.step.preview.fits", "Fits your layover")} ·{" "}
            <span className="text-warm-cream/60 font-normal">
              {formatMinutes(budget.remaining)} spare
            </span>
          </p>
        )}
      </div>

      {/* Time breakdown */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] p-3">
          <p className="font-mono text-lg font-semibold text-warm-cream">
            {formatMinutes(route.totalVisitMinutes)}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wide mt-0.5">
            {t(labels, "public.builder.summary.visit", "Visit")}
          </p>
        </div>
        <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] p-3">
          <p className="font-mono text-lg font-semibold text-warm-cream">
            {formatMinutes(route.totalTravelMinutes)}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wide mt-0.5">
            {t(labels, "public.builder.summary.travel", "Travel")}
          </p>
        </div>
        <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] p-3">
          <p className={`font-mono text-lg font-semibold ${budget.fits ? "text-legend-gold" : "text-red-400"}`}>
            {formatMinutes(route.totalVisitMinutes + route.totalTravelMinutes)}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wide mt-0.5">
            {t(labels, "public.builder.summary.total", "Total")}
          </p>
        </div>
      </div>

      {/* Stop list */}
      <ol className="space-y-2">
        <li className="flex items-center gap-3 text-sm text-warm-cream/50 px-1">
          <div className="w-6 h-6 rounded-full bg-canal-blue/40 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-canal-light" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </div>
          <span>Schiphol Airport</span>
        </li>

        {orderedStops.map((stop, idx) => {
          const leg = route.legs[idx];
          return (
            <li key={stop.id}>
              {leg && leg.minutes > 0 && (
                <div className="flex items-center gap-2 pl-9 pb-1 text-[11px] text-muted font-mono">
                  <div className="w-px h-4 bg-warm-cream/10 ml-3" />
                  <span>{formatMinutes(leg.minutes)} drive</span>
                  {leg.meters > 0 && <span>· {(leg.meters / 1000).toFixed(1)} km</span>}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-legend-gold flex items-center justify-center text-ink-black text-[10px] font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-cream truncate">{stop.name}</p>
                  <p className="text-[11px] text-muted">{formatMinutes(stop.duration_minutes)} visit</p>
                </div>
                <button
                  onClick={() => onRemoveStop(stop.id)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-warm-cream/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  aria-label={`Remove ${stop.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}

        <li className="flex items-center gap-3 text-sm text-warm-cream/50 px-1 pt-1">
          <div className="w-6 h-6 rounded-full bg-canal-blue/40 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-canal-light" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </div>
          <span>Return to Schiphol</span>
        </li>
      </ol>
    </div>
  );
}
