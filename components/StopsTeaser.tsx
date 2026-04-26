import type { StopsTeaser as StopsTeaserData } from "@/lib/public/stops";
import { CATEGORY_META } from "@/lib/admin/stops-types";

type Props = {
  data: StopsTeaserData;
};

export default function StopsTeaser({ data }: Props) {
  if (data.totalCount === 0) return null;

  return (
    <section
      aria-labelledby="stops-teaser-heading"
      className="w-full max-w-4xl mx-auto pt-12 sm:pt-20 pb-4 space-y-10"
    >
      <header className="text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-orange/90 font-semibold">
          What you&apos;ll discover
        </p>
        <h2
          id="stops-teaser-heading"
          className="text-3xl sm:text-4xl font-bold tracking-tight"
        >
          {data.totalCount} free stops, hand-picked.
        </h2>
        <p className="text-sm sm:text-base text-brand-cream/75 max-w-2xl mx-auto">
          Every layover, packed with the things Amsterdam does best — and
          every one of them is free. No tickets, no queues. Just the city.
        </p>
      </header>

      {data.featured.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.featured.slice(0, 6).map((stop) => {
            const meta = CATEGORY_META[stop.category];
            return (
              <div
                key={stop.id}
                className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 hover:bg-brand-cream/[0.07] transition-colors p-5 text-left flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-cream/55">
                  <span aria-hidden>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </div>
                <h3 className="text-base font-semibold text-brand-cream">
                  {stop.name}
                </h3>
                {stop.description && (
                  <p className="text-xs text-brand-cream/70 line-clamp-3">
                    {stop.description}
                  </p>
                )}
                {stop.neighborhood && (
                  <p className="text-xs text-brand-orange/80 mt-auto pt-2">
                    {stop.neighborhood}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/[0.03] p-5 sm:p-6">
        <p className="text-xs uppercase tracking-wide text-brand-cream/55 mb-4">
          Across {data.byCategory.length} categories
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
          {data.byCategory.map((c) => (
            <li
              key={c.category}
              className="flex items-center justify-between text-sm text-brand-cream/85"
            >
              <span className="flex items-center gap-2 truncate">
                <span aria-hidden>{c.emoji}</span>
                <span className="truncate">{c.label}</span>
              </span>
              <span className="text-brand-orange font-semibold tabular-nums">
                {c.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-brand-cream/50">
        Sign up above to be the first to plan your tour when bookings open.
      </p>
    </section>
  );
}
