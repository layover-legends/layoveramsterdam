"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { PublicAddon } from "@/lib/public/tour-addons";
import { t } from "@/lib/i18n/t";
import { formatPrice } from "@/lib/i18n/format-price";

type Props = {
  addons: PublicAddon[];
  tourSlug: string;
  labels: Record<string, string>;
};

export default function AddonHeroStripClient({ addons, tourSlug, labels }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedSlugs = (searchParams.get("addons") ?? "").split(",").filter(Boolean);

  function toggle(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("addons")?.split(",").filter(Boolean) ?? [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];

    if (next.length > 0) {
      params.set("addons", next.join(","));
    } else {
      params.delete("addons");
    }
    // Remove layover param so it doesn't confuse the new booking page
    params.delete("layover");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const addonParam = selectedSlugs.length > 0 ? `&addons=${selectedSlugs.join(",")}` : "";
  const bookingUrl = `/booking/new?tour=${tourSlug}&party=1${addonParam}`;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-warm-cream">
        {t(labels, "tour.addons.heading", "Add to your day")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {addons.map((addon) => {
          const isSelected = selectedSlugs.includes(addon.slug);
          return (
            <button
              key={addon.slug}
              onClick={() => toggle(addon.slug)}
              className={`text-left rounded-2xl border p-4 transition-all space-y-2 ${
                isSelected
                  ? "border-legend-gold bg-legend-gold/10"
                  : "border-warm-cream/10 bg-warm-cream/[0.03] hover:border-warm-cream/20 hover:bg-warm-cream/[0.06]"
              }`}
            >
              <p className="font-semibold text-sm text-warm-cream">{addon.name}</p>
              {addon.short_blurb && (
                <p className="text-xs text-warm-cream/60 line-clamp-2">{addon.short_blurb}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-mono text-legend-gold">
                  +{formatPrice(addon.price_cents, "EUR")}
                  {addon.pricing_model === "per_person" && (
                    <span className="text-xs font-sans text-warm-cream/50">
                      {" "}
                      {t(labels, "tour.addons.per_person", "/ person")}
                    </span>
                  )}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    isSelected
                      ? "border-legend-gold/50 bg-legend-gold/15 text-legend-gold"
                      : "border-warm-cream/15 text-warm-cream/40"
                  }`}
                >
                  {isSelected
                    ? t(labels, "tour.addons.added", "Added ✓")
                    : t(labels, "tour.addons.add", "Add")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <a
        href={bookingUrl}
        className="inline-block px-8 py-3.5 rounded-full bg-legend-gold text-ink-black font-semibold tracking-wide hover:bg-gold-light transition-colors"
      >
        Book this tour →
      </a>
    </div>
  );
}
