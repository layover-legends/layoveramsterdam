"use client";

import { useState } from "react";
import type { PublicService } from "@/lib/public/shop";
import { t } from "@/lib/i18n/ui";
import ServiceCard from "./ServiceCard";

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
  services: PublicService[];
  labels: Record<string, string>;
};

export default function ShopGrid({ services, labels }: Props) {
  const [filter, setFilter] = useState<"all" | "active" | "coming_soon">("all");

  const filtered =
    filter === "all" ? services : services.filter((s) => s.availability_status === filter);

  const byCategory = new Map<string, PublicService[]>();
  for (const cat of CATEGORY_ORDER) {
    const group = filtered.filter((s) => s.category === cat);
    if (group.length > 0) byCategory.set(cat, group);
  }
  // catch-all for categories not in CATEGORY_ORDER
  const remaining = filtered.filter((s) => !CATEGORY_ORDER.includes(s.category as typeof CATEGORY_ORDER[number]));
  if (remaining.length > 0) byCategory.set("other", remaining);

  const filterButtons: { key: "all" | "active" | "coming_soon"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: t(labels, "admin.services.status.active", "Active") },
    { key: "coming_soon", label: t(labels, "shop.coming_soon.label", "Coming soon") },
  ];

  return (
    <div className="space-y-10">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === btn.key
                ? "bg-legend-gold text-ink-black"
                : "border border-warm-cream/15 text-warm-cream/60 hover:text-warm-cream hover:border-warm-cream/30"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-warm-cream/40 text-sm py-8 text-center">
          {t(labels, "shop.empty", "Nothing here yet — check back soon.")}
        </p>
      )}

      {[...byCategory.entries()].map(([cat, items]) => (
        <section key={cat} className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-warm-cream/40">
            {t(labels, `booking.category.${cat}`, cat)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((s) => (
              <ServiceCard key={s.slug} service={s} labels={labels} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
