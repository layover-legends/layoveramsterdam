"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/i18n/format-price";
import MarginBadge from "@/components/admin/services/MarginBadge";
import ServiceTable from "@/components/admin/services/ServiceTable";
import type { ServiceRow } from "@/components/admin/services/ServiceTable";

type TourRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  price_cents: number | null;
  vat_rate: number;
  updated_at: string | null;
};

type Props = {
  tours: TourRow[];
  addons: ServiceRow[];
  standalones: ServiceRow[];
};

type Tab = "tours" | "addons" | "standalones";

export default function ServicesClient({ tours, addons, standalones }: Props) {
  const [tab, setTab] = useState<Tab>("tours");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "tours", label: "Tours", count: tours.length },
    { key: "addons", label: "Add-ons", count: addons.length },
    { key: "standalones", label: "Standalones", count: standalones.length },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-warm-cream/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-legend-gold text-legend-gold"
                : "border-transparent text-warm-cream/50 hover:text-warm-cream/80"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-legend-gold/20 text-legend-gold" : "bg-warm-cream/8 text-warm-cream/40"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tours tab — simplified (no availability_status, no service_type) */}
      {tab === "tours" && (
        <div className="overflow-x-auto rounded-2xl border border-warm-cream/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-cream/10 text-[10px] uppercase tracking-wider text-warm-cream/40">
                <th className="text-left px-4 py-3">Tour</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/8">
              {tours.map((tour) => (
                <tr key={tour.id} className="hover:bg-warm-cream/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-warm-cream">{tour.name}</p>
                    <p className="text-[10px] text-warm-cream/35 font-mono">{tour.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      tour.is_active
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                        : "bg-warm-cream/8 text-warm-cream/40 border-warm-cream/15"
                    }`}>
                      {tour.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-warm-cream">
                    {tour.price_cents != null ? formatPrice(tour.price_cents, "EUR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MarginBadge
                      price_cents={tour.price_cents ?? 0}
                      vat_rate={tour.vat_rate}
                      cogs_cents={null}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "addons" && <ServiceTable rows={addons} />}
      {tab === "standalones" && <ServiceTable rows={standalones} />}
    </div>
  );
}
