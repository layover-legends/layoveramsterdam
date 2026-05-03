"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicAddon } from "@/lib/public/tour-addons";
import { updateBookingAddons } from "@/app/actions/booking";
import { t } from "@/lib/i18n/t";
import { formatPrice } from "@/lib/i18n/format-price";
import PriceSummary from "./PriceSummary";

const CATEGORY_ORDER = [
  "photo",
  "connectivity",
  "mobility",
  "tickets",
  "food",
  "comfort",
  "souvenir",
  "premium",
] as const;

type Props = {
  bookingId: string;
  tourName: string | null;
  tourSlug: string | null;
  baseCents: number;
  partySize: number;
  currency: string;
  addons: PublicAddon[];
  initialSelectedSlugs: string[];
  labels: Record<string, string>;
};

export default function AddonStepClient({
  bookingId,
  tourName,
  baseCents,
  partySize,
  currency,
  addons,
  initialSelectedSlugs,
  labels,
}: Props) {
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(
    new Set(initialSelectedSlugs),
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selectedAddons = addons.filter((a) => selectedSlugs.has(a.slug));

  const byCategory = new Map<string, PublicAddon[]>();
  for (const cat of CATEGORY_ORDER) {
    const group = addons.filter((a) => a.category === cat);
    if (group.length > 0) byCategory.set(cat, group);
  }

  function toggle(slug: string) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function persist(slugs: string[]) {
    startTransition(async () => {
      const result = await updateBookingAddons(bookingId, slugs);
      if (result.ok) {
        router.push(`/booking/${bookingId}/review`);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-warm-cream/40 mb-1">Step 2 of 4</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {t(labels, "booking.step.addons.title", "Add-ons (optional)")}
          </h1>
        </div>
        <button
          onClick={() => persist([])}
          disabled={pending}
          className="flex-none text-sm text-warm-cream/50 hover:text-warm-cream/80 transition-colors disabled:opacity-40 pt-1"
        >
          {t(labels, "booking.step.addons.skip", "Skip add-ons →")}
        </button>
      </div>

      {/* Catalog grouped by category */}
      <div className="space-y-6">
        {[...byCategory.entries()].map(([cat, catAddons]) => (
          <div key={cat} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-warm-cream/40 px-1">
              {t(labels, `booking.category.${cat}`, cat)}
            </h2>
            <div className="space-y-2">
              {catAddons.map((addon) => {
                const isSelected = selectedSlugs.has(addon.slug);
                const lineTotal =
                  addon.pricing_model === "per_person"
                    ? addon.price_cents * partySize
                    : addon.price_cents;

                return (
                  <button
                    key={addon.slug}
                    onClick={() => toggle(addon.slug)}
                    className={`w-full text-left rounded-xl border px-4 py-3 flex items-center justify-between gap-4 transition-all ${
                      isSelected
                        ? "border-legend-gold bg-legend-gold/8"
                        : "border-warm-cream/10 hover:border-warm-cream/20 hover:bg-warm-cream/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox visual */}
                      <div
                        className={`flex-none w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-legend-gold bg-legend-gold"
                            : "border-warm-cream/30"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 10 8"
                            className="w-2.5 h-2 text-ink-black"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M1 4l3 3 5-6" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-warm-cream">{addon.name}</p>
                        {addon.short_blurb && (
                          <p className="text-xs text-warm-cream/50 truncate">{addon.short_blurb}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-sm font-mono text-legend-gold">
                        +{formatPrice(lineTotal, currency)}
                      </p>
                      {addon.pricing_model === "per_person" && (
                        <p className="text-[10px] text-warm-cream/40">
                          {t(labels, "tour.addons.per_person", "/ person")}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Live price summary */}
      <PriceSummary
        tourName={tourName}
        baseCents={baseCents}
        currency={currency}
        partySize={partySize}
        selectedAddons={selectedAddons}
        labels={labels}
      />

      {/* Continue CTA */}
      <button
        onClick={() => persist([...selectedSlugs])}
        disabled={pending}
        className="w-full py-3.5 rounded-full bg-legend-gold text-ink-black font-semibold tracking-wide hover:bg-gold-light active:bg-gold-dark transition-colors disabled:opacity-50"
      >
        {pending
          ? "Saving…"
          : t(labels, "booking.step.addons.continue", "Continue to review →")}
      </button>
    </div>
  );
}
