"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/i18n/format-price";
import MarginBadge from "./MarginBadge";
import AvailabilityToggle from "./AvailabilityToggle";
import SyncStatusBadge from "./SyncStatusBadge";
import ServiceEditDrawer from "./ServiceEditDrawer";
import WaitlistDrawer from "./WaitlistDrawer";
import { syncServiceToStripe } from "@/app/actions/sync-stripe";
import type { AvailabilityStatus } from "@/app/admin/services/actions";
import type { ServiceKind } from "@/lib/stripe/types";

export type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  service_type: "addon" | "standalone" | "both";
  service_kind: ServiceKind;
  availability_status: AvailabilityStatus;
  price_cents: number;
  cogs_cents: number | null;
  vat_rate: number;
  pricing_model: "flat" | "per_person";
  sort_order: number;
  waitlist_count: number;
  stripe_product_id: string | null;
  stripe_synced_at: string | null;
  stripe_sync_error: string | null;
  updated_at: string | null;
};

type Props = {
  rows: ServiceRow[];
};

const TYPE_BADGE: Record<string, string> = {
  addon: "bg-canal-blue/20 text-canal-light border-canal-blue/30",
  standalone: "bg-legend-gold/15 text-legend-gold border-legend-gold/25",
  both: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

function SyncButton({ row }: { row: ServiceRow }) {
  const [, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await syncServiceToStripe(row.service_kind, row.id);
        })
      }
      className="text-[10px] text-warm-cream/40 hover:text-legend-gold transition-colors"
      title="Force resync to Stripe"
    >
      ↻
    </button>
  );
}

export default function ServiceTable({ rows }: Props) {
  const [editService, setEditService] = useState<ServiceRow | null>(null);
  const [waitlistService, setWaitlistService] = useState<ServiceRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-warm-cream/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-cream/10 text-[10px] uppercase tracking-wider text-warm-cream/40">
              <th className="text-left px-4 py-3">Service</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Type</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3 hidden xl:table-cell">Stripe</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">COGS</th>
              <th className="text-right px-4 py-3">Margin</th>
              <th className="text-right px-4 py-3 hidden lg:table-cell">Waitlist</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-cream/8">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-warm-cream/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-warm-cream">{row.name}</p>
                  <p className="text-[10px] text-warm-cream/35 font-mono">{row.slug}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_BADGE[row.service_type] ?? ""}`}
                  >
                    {row.service_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <AvailabilityToggle
                    serviceId={row.id}
                    serviceKind={row.service_kind}
                    serviceName={row.name}
                    current={row.availability_status}
                    waitlistCount={row.waitlist_count}
                  />
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <div className="flex items-center gap-1.5">
                    <SyncStatusBadge
                      stripeProductId={row.stripe_product_id}
                      stripeSyncedAt={row.stripe_synced_at}
                      stripeSyncError={row.stripe_sync_error}
                      updatedAt={row.updated_at}
                    />
                    <SyncButton row={row} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-warm-cream">
                  {formatPrice(row.price_cents, "EUR")}
                  {row.pricing_model === "per_person" && (
                    <span className="text-[9px] text-warm-cream/40 block">/ person</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-warm-cream/50 hidden md:table-cell">
                  {row.cogs_cents != null ? formatPrice(row.cogs_cents, "EUR") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <MarginBadge
                    price_cents={row.price_cents}
                    vat_rate={row.vat_rate}
                    cogs_cents={row.cogs_cents}
                    pricing_model={row.pricing_model}
                  />
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  {row.waitlist_count > 0 ? (
                    <button
                      onClick={() => setWaitlistService(row)}
                      className="text-xs text-warm-cream/50 hover:text-legend-gold transition-colors"
                    >
                      {row.waitlist_count} →
                    </button>
                  ) : (
                    <span className="text-xs text-warm-cream/20">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditService(row)}
                    className="text-xs text-warm-cream/40 hover:text-warm-cream transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editService && (
        <ServiceEditDrawer service={editService} onClose={() => setEditService(null)} />
      )}
      {waitlistService && (
        <WaitlistDrawer
          serviceId={waitlistService.id}
          serviceName={waitlistService.name}
          onClose={() => setWaitlistService(null)}
        />
      )}
    </>
  );
}
