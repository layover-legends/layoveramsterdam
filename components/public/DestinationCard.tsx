import Link from "next/link";
import type { PublicStop } from "@/lib/public/stops-list-types";
import { SmartImage } from "@/components/photos/SmartImage";

type Props = {
  stop: PublicStop;
  freeLabel?: string;
  paidLabel?: string;
  viewLabel?: string;
};

export default function DestinationCard({
  stop,
  freeLabel = "Free",
  paidLabel = "Paid",
  viewLabel = "View →",
}: Props) {
  return (
    <Link
      href={`/stops/${stop.slug}`}
      className="group flex flex-col rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03] overflow-hidden transition-all duration-200 hover:border-legend-gold/30 hover:bg-warm-cream/[0.06]"
    >
      {/* Photo or placeholder */}
      {stop.primary_photo_url ? (
        <SmartImage
          fallbackUrl={stop.primary_photo_url}
          alt={stop.name}
          ratio="4:3"
          className="h-40 transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="h-40 bg-canal-blue/10 flex items-center justify-center">
          <span className="text-3xl text-warm-cream/20">◆</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Name + area row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold leading-snug line-clamp-2 group-hover:text-legend-gold transition-colors">
              {stop.name}
            </h3>
            {stop.area && (
              <p className="text-xs text-muted mt-0.5 truncate">{stop.area}</p>
            )}
          </div>

          {/* Free / Paid badge */}
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide mt-0.5 ${
              stop.requires_booking
                ? "bg-legend-gold/15 text-legend-gold"
                : "bg-warm-cream/8 text-warm-cream/60"
            }`}
          >
            {stop.requires_booking ? paidLabel : freeLabel}
          </span>
        </div>

        {/* Category badge */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-[10px] text-legend-gold/70 uppercase tracking-wide truncate">
            {stop.category_name}
          </span>
          <span className="text-[10px] text-warm-cream/40 shrink-0">{viewLabel}</span>
        </div>
      </div>
    </Link>
  );
}
