"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FeaturedTour } from "@/lib/public/featured-tours";

type Props = {
  tour: FeaturedTour;
  recommended?: boolean;
};

// Blueprint+ D2 — price counts up from €0 to actual value over 400ms
function useCountUp(target: number | null, active: boolean) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || target === null) return;
    const start = performance.now();
    const duration = 400;
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (elapsed < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [active, target]);

  return displayed;
}

export default function TourCard({ tour, recommended = false }: Props) {
  const [hovered, setHovered] = useState(false);
  const price = useCountUp(tour.price_cents, hovered);

  const formattedPrice = tour.price_cents !== null
    ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: tour.currency, maximumFractionDigits: 0 }).format(
        hovered ? price / 100 : tour.price_cents / 100,
      )
    : "Free";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col rounded-2xl border bg-warm-cream/[0.03] overflow-hidden transition-all duration-300 ${
        hovered
          ? "border-legend-gold/50 shadow-xl shadow-legend-gold/10 -translate-y-1"
          : "border-warm-cream/10"
      }`}
    >
      {/* Recommended badge — Blueprint+ W2 */}
      {recommended && (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-legend-gold text-ink-black text-[10px] font-bold uppercase tracking-widest shadow-lg">
          Recommended
        </div>
      )}

      {/* Photo placeholder — Blueprint+ D7 note: replace with real photo */}
      <div
        className={`w-full h-48 bg-gradient-to-br from-canal-blue/30 via-ink-black to-ink-black/80 flex items-center justify-center overflow-hidden transition-transform duration-500 ${
          hovered ? "scale-[1.05]" : "scale-100"
        }`}
      >
        <div className="text-center space-y-1 opacity-30">
          <div className="text-5xl">◆</div>
          <p className="text-[10px] uppercase tracking-widest text-warm-cream/60">Amsterdam</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5 space-y-3">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-tight leading-snug">
            {tour.name}
          </h3>
          {tour.tagline && (
            <p className="text-sm text-warm-cream/60 mt-1 line-clamp-2">{tour.tagline}</p>
          )}
        </div>

        {/* Scarcity badge — Blueprint+ W2 (static fallback until live inventory) */}
        <p className="text-xs text-amber-300/80 font-medium">Limited spots available</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tour.duration_hours && (
            <span className="px-2 py-0.5 rounded-full bg-warm-cream/8 text-warm-cream/60 text-[11px]">
              {tour.duration_hours}h
            </span>
          )}
          {tour.max_group_size && (
            <span className="px-2 py-0.5 rounded-full bg-warm-cream/8 text-warm-cream/60 text-[11px]">
              Max {tour.max_group_size}
            </span>
          )}
          {tour.is_adult_only && (
            <span className="px-2 py-0.5 rounded-full bg-red-400/15 text-red-200 text-[11px]">18+</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-warm-cream/8">
          <div className="font-display text-2xl font-semibold text-legend-gold">
            {formattedPrice}
          </div>
          <Link
            href={`/tours/${tour.slug}`}
            className="px-4 py-2 rounded-full bg-legend-gold text-ink-black text-xs font-semibold uppercase tracking-widest hover:bg-gold-light transition-colors"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}
