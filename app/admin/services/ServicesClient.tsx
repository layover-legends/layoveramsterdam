"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/i18n/format-price";
import MarginBadge from "@/components/admin/services/MarginBadge";
import SyncStatusBadge from "@/components/admin/services/SyncStatusBadge";
import SyncAllButton from "@/components/admin/services/SyncAllButton";
import ServiceTable from "@/components/admin/services/ServiceTable";
import ServiceEditDrawer from "@/components/admin/services/ServiceEditDrawer";
import type { ServiceRow } from "@/components/admin/services/ServiceTable";
import type { TourEditRow, AddonEditRow } from "@/components/admin/services/ServiceEditDrawer";

export type TourRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  is_active: boolean;
  price_cents: number | null;
  vat_rate: number;
  pricing_model: string;
  min_group_size: number;
  max_group_size: number | null;
  transport_mode: string;
  delivery_mode: string;
  duration_hours: number | null;
  is_adult_only: boolean;
  launch_mode: boolean;
  image_url: string | null;
  stripe_product_id: string | null;
  stripe_synced_at: string | null;
  stripe_sync_error: string | null;
  updated_at: string | null;
};

type Props = {
  tours: TourRow[];
  outOfSyncCount: number;
  addons: ServiceRow[];
  standalones: ServiceRow[];
  cityId: string;
};

type Tab = "tours" | "addons" | "standalones";
type Creating = "tour" | "addon" | "standalone" | null;

function blankTour(cityId: string): TourEditRow {
  return {
    id: "__new__",
    slug: "",
    name: "",
    description: null,
    tagline: null,
    is_active: false,
    price_cents: 0,
    vat_rate: 0.21,
    pricing_model: "flat",
    min_group_size: 1,
    max_group_size: 6,
    transport_mode: "van",
    delivery_mode: "human_guide",
    duration_hours: 4,
    is_adult_only: false,
    launch_mode: true,
    image_url: null,
  };
}

function blankAddon(serviceType: "addon" | "standalone"): AddonEditRow {
  return {
    id: "__new__",
    slug: "",
    name: "",
    description: null,
    price_cents: 0,
    cogs_cents: null,
    vat_rate: 0.21,
    sort_order: 100,
    pricing_model: "flat",
    service_type: serviceType,
    availability_status: "inactive",
    category: "premium",
    fulfillment: "digital",
    image_url: null,
  };
}

export default function ServicesClient({
  tours,
  addons,
  standalones,
  outOfSyncCount,
  cityId,
}: Props) {
  const [tab, setTab] = useState<Tab>("tours");
  const [editTour, setEditTour] = useState<TourRow | null>(null);
  const [creating, setCreating] = useState<Creating>(null);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "tours", label: "Tours", count: tours.length },
    { key: "addons", label: "Add-ons", count: addons.length },
    { key: "standalones", label: "Standalones", count: standalones.length },
  ];

  const ADD_LABELS: Record<Tab, string> = {
    tours: "+ Add new tour",
    addons: "+ Add new add-on",
    standalones: "+ Add new standalone",
  };

  function openCreate() {
    setCreating(tab === "tours" ? "tour" : tab === "addons" ? "addon" : "standalone");
  }

  return (
    <div className="space-y-6">
      {/* Sync all + Add new */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-legend-gold text-ink-black text-xs font-semibold hover:bg-gold-light transition-colors"
        >
          {ADD_LABELS[tab]}
        </button>
        <SyncAllButton outOfSyncCount={outOfSyncCount} />
      </div>

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
            <span
              className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key
                  ? "bg-legend-gold/20 text-legend-gold"
                  : "bg-warm-cream/8 text-warm-cream/40"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tours tab */}
      {tab === "tours" && (
        <div className="overflow-x-auto rounded-2xl border border-warm-cream/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-cream/10 text-[10px] uppercase tracking-wider text-warm-cream/40">
                <th className="text-left px-4 py-3">Tour</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Stripe</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Margin</th>
                <th className="text-right px-4 py-3"></th>
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
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        tour.is_active
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                          : "bg-warm-cream/8 text-warm-cream/40 border-warm-cream/15"
                      }`}
                    >
                      {tour.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <SyncStatusBadge
                      stripeProductId={tour.stripe_product_id}
                      stripeSyncedAt={tour.stripe_synced_at}
                      stripeSyncError={tour.stripe_sync_error}
                      updatedAt={tour.updated_at}
                    />
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={() => setEditTour(tour)}
                        className="text-xs text-warm-cream/40 hover:text-warm-cream transition-colors"
                      >
                        Edit
                      </button>
                      <Link
                        href={`/admin/tours/${tour.id}`}
                        className="text-[10px] text-legend-gold/70 hover:text-legend-gold transition-colors"
                      >
                        Stops →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "addons" && <ServiceTable rows={addons} />}
      {tab === "standalones" && <ServiceTable rows={standalones} />}

      {/* Edit tour drawer */}
      {editTour && (
        <ServiceEditDrawer
          source="tour"
          cityId={cityId}
          row={{
            id: editTour.id,
            slug: editTour.slug,
            name: editTour.name,
            description: editTour.description,
            tagline: editTour.tagline,
            is_active: editTour.is_active,
            price_cents: editTour.price_cents ?? 0,
            vat_rate: editTour.vat_rate,
            pricing_model: editTour.pricing_model,
            min_group_size: editTour.min_group_size,
            max_group_size: editTour.max_group_size,
            transport_mode: editTour.transport_mode,
            delivery_mode: editTour.delivery_mode,
            duration_hours: editTour.duration_hours,
            is_adult_only: editTour.is_adult_only,
            launch_mode: editTour.launch_mode,
            image_url: editTour.image_url,
          } satisfies TourEditRow}
          onClose={() => setEditTour(null)}
        />
      )}

      {/* Create drawers */}
      {creating === "tour" && (
        <ServiceEditDrawer
          source="tour"
          cityId={cityId}
          row={blankTour(cityId)}
          onClose={() => setCreating(null)}
        />
      )}
      {(creating === "addon" || creating === "standalone") && (
        <ServiceEditDrawer
          source="addon"
          cityId={cityId}
          row={blankAddon(creating === "addon" ? "addon" : "standalone")}
          onClose={() => setCreating(null)}
        />
      )}
    </div>
  );
}
