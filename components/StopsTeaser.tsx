import Image from "next/image";
import type { StopsTeaser as StopsTeaserData } from "@/lib/public/stops";
import { t, tpl } from "@/lib/i18n/ui";

type Props = {
  data: StopsTeaserData;
  strings: Record<string, string>;
};

export default function StopsTeaser({ data, strings }: Props) {
  if (data.totalCount === 0) return null;

  return (
    <section
      aria-labelledby="stops-teaser-heading"
      className="w-full max-w-4xl mx-auto pt-12 sm:pt-20 pb-4 space-y-10"
    >
      <header className="text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-legend-gold/90 font-semibold">
          {t(strings, "stops_teaser.discover", "What you'll discover")}
        </p>
        <h2
          id="stops-teaser-heading"
          className="font-display text-3xl sm:text-4xl font-semibold tracking-tight"
        >
          {tpl(
            t(strings, "stops_teaser.free_count", "{count} free stops, hand-picked."),
            { count: data.totalCount },
          )}
        </h2>
        <p className="text-sm sm:text-base text-warm-cream/75 max-w-2xl mx-auto">
          {t(
            strings,
            "stops_teaser.description",
            "Every layover, packed with the things Amsterdam does best — and every one of them is free. No tickets, no queues. Just the city.",
          )}
        </p>
      </header>

      {data.featured.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.featured.slice(0, 6).map((stop) => (
            <div
              key={stop.id}
              className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 hover:bg-warm-cream/[0.07] transition-colors text-left flex flex-col overflow-hidden"
            >
              {stop.primary_photo_url && (
                <div className="relative w-full h-40">
                  <Image
                    src={stop.primary_photo_url}
                    alt={stop.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-5 flex flex-col gap-2 flex-1">
                {stop.category_name && (
                  <div className="text-xs uppercase tracking-wide text-warm-cream/55">
                    {stop.category_name}
                  </div>
                )}
                <h3 className="text-base font-semibold text-warm-cream">
                  {stop.name}
                </h3>
                {stop.description && (
                  <p className="text-xs text-warm-cream/70 line-clamp-3">
                    {stop.description}
                  </p>
                )}
                {stop.area && (
                  <p className="text-xs text-legend-gold/80 mt-auto pt-2">
                    {stop.area}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03] p-5 sm:p-6">
        <p className="text-xs uppercase tracking-wide text-warm-cream/55 mb-4">
          {tpl(
            t(strings, "stops_teaser.categories", "Across {count} categories"),
            { count: data.byCategory.length },
          )}
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
          {data.byCategory.map((c) => (
            <li
              key={c.category_id}
              className="flex items-center justify-between text-sm text-warm-cream/85"
            >
              <span className="truncate">{c.name}</span>
              <span className="text-legend-gold font-semibold tabular-nums">
                {c.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-warm-cream/50">
        {t(
          strings,
          "stops_teaser.signup_cta",
          "Sign up above to be the first to plan your tour when bookings open.",
        )}
      </p>
    </section>
  );
}
