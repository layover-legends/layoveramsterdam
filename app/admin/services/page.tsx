import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import ServicesClient from "./ServicesClient";
import type { ServiceRow } from "@/components/admin/services/ServiceTable";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [toursRes, addonsRes, waitlistRes] = await Promise.all([
    admin
      .from("tours")
      .select(
        "id, slug, name, description, tagline, is_active, price_cents, vat_rate, pricing_model, min_group_size, max_group_size, transport_mode, delivery_mode, duration_hours, is_adult_only, launch_mode, stripe_product_id, stripe_synced_at, stripe_sync_error, updated_at",
      )
      .order("name"),
    admin
      .from("addons")
      .select(
        "id, slug, name, description, category, fulfillment, service_type, availability_status, price_cents, cogs_cents, vat_rate, pricing_model, sort_order, stripe_product_id, stripe_synced_at, stripe_sync_error, updated_at",
      )
      .eq("is_active", true)
      .order("sort_order"),
    admin
      .from("service_interest")
      .select("service_id")
      .then((r) => {
        const counts = new Map<string, number>();
        for (const row of (r.data ?? []) as { service_id: string }[]) {
          counts.set(row.service_id, (counts.get(row.service_id) ?? 0) + 1);
        }
        return counts;
      }),
  ]);

  type TourRaw = {
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
    stripe_product_id: string | null;
    stripe_synced_at: string | null;
    stripe_sync_error: string | null;
    updated_at: string | null;
  };

  type AddonRaw = {
    id: string;
    slug: string;
    name: string | null;
    description: string | null;
    category: string;
    fulfillment: string;
    service_type: string;
    availability_status: string;
    price_cents: number;
    cogs_cents: number | null;
    vat_rate: number;
    pricing_model: string;
    sort_order: number;
    stripe_product_id: string | null;
    stripe_synced_at: string | null;
    stripe_sync_error: string | null;
    updated_at: string | null;
  };

  const tours = (toursRes.data ?? []) as TourRaw[];
  const allAddons = (addonsRes.data ?? []) as AddonRaw[];
  const waitlistCounts = waitlistRes;

  function toServiceRow(a: AddonRaw): ServiceRow {
    return {
      id: a.id,
      slug: a.slug,
      name: a.name ?? a.slug,
      description: a.description,
      category: a.category,
      fulfillment: a.fulfillment,
      service_type: a.service_type as ServiceRow["service_type"],
      service_kind: "addon",
      availability_status: a.availability_status as ServiceRow["availability_status"],
      price_cents: a.price_cents,
      cogs_cents: a.cogs_cents,
      vat_rate: Number(a.vat_rate),
      pricing_model: a.pricing_model as ServiceRow["pricing_model"],
      sort_order: a.sort_order,
      waitlist_count: waitlistCounts.get(a.id) ?? 0,
      stripe_product_id: a.stripe_product_id,
      stripe_synced_at: a.stripe_synced_at,
      stripe_sync_error: a.stripe_sync_error,
      updated_at: a.updated_at,
    };
  }

  const addons = allAddons.filter((a) => a.service_type === "addon").map(toServiceRow);
  const standalones = allAddons
    .filter((a) => a.service_type === "standalone" || a.service_type === "both")
    .map(toServiceRow);

  // Count out-of-sync items for SyncAllButton
  function needsSync(row: {
    stripe_product_id: string | null;
    stripe_synced_at: string | null;
    updated_at: string | null;
  }) {
    return (
      !row.stripe_product_id ||
      !row.stripe_synced_at ||
      (row.updated_at && new Date(row.updated_at) > new Date(row.stripe_synced_at))
    );
  }

  const outOfSyncCount =
    tours.filter(needsSync).length +
    addons.filter((r) => needsSync(r as { stripe_product_id: string | null; stripe_synced_at: string | null; updated_at: string | null })).length +
    standalones.filter((r) => needsSync(r as { stripe_product_id: string | null; stripe_synced_at: string | null; updated_at: string | null })).length;

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-warm-cream">Services</h1>
        <p className="text-sm text-warm-cream/50">
          {tours.length} tours · {addons.length} add-ons · {standalones.length} standalones
        </p>
      </header>

      <ServicesClient
        tours={tours}
        addons={addons}
        standalones={standalones}
        outOfSyncCount={outOfSyncCount}
      />
    </main>
  );
}
