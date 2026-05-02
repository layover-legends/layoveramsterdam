import Link from "next/link";
import TourCard from "./TourCard";
import type { FeaturedTour } from "@/lib/public/featured-tours";

type Props = {
  tours: FeaturedTour[];
};

export default function FeaturedTours({ tours }: Props) {
  return (
    <section className="py-20 px-5 border-t border-warm-cream/8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-legend-gold font-semibold">
              Featured tours
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Amsterdam&rsquo;s finest — between your flights
            </h2>
          </div>
          <Link
            href="/tours"
            className="shrink-0 text-sm text-legend-gold hover:text-gold-light transition-colors underline underline-offset-4"
          >
            View all tours →
          </Link>
        </div>

        {tours.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03] h-80 flex items-center justify-center"
              >
                <p className="text-sm text-warm-cream/30">Tours launching soon</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tours.map((tour, i) => (
              <TourCard key={tour.id} tour={tour} recommended={i === 0} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
