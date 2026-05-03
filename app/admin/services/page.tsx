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
      .select("id, slug, name, is_active, price_cents, vat_rate, updated_at")
      .order("name"),
    admin
      .from("addons")
      .select(
        "id, slug, name, service_type, availability_status, price_cents, cogs_cents, vat_rate, pricing_model, sort_order, stripe_price_id, updated_at",
      )
      .eq("is_active", true)
      .order("sort_order"),
    admin
      .from("service_interest")
      .select("service_id")
      .then((r) => {
        // Count per service_id
        const counts = new Map<string, number>();
        for (const row of (r.data ?? []) as { service_id: string }[]) {
          counts.set(row.service_id, (counts.get(row.service_id) ?? 0) + 1);
        }
        return counts;
      }),
  ]);

  type TourRow = {
    id: string;
    slug: string;
    name: string;
    is_active: boolean;
    price_cents: number | null;
    vat_rate: number;
    updated_at: string | null;
  };

  type AddonRaw = {
    id: string;
    slug: string;
    name: string | null;
    service_type: string;
    availability_status: string;
    price_cents: number;
    cogs_cents: number | null;
    vat_rate: number;
    pricing_model: string;
    sort_order: number;
    stripe_price_id: string | null;
    updated_at: string | null;
  };

  const tours = (toursRes.data ?? []) as TourRow[];

  const allAddons = (addonsRes.data ?? []) as AddonRaw[];
  const waitlistCounts = waitlistRes;

  function toServiceRow(a: AddonRaw): ServiceRow {
    return {
      id: a.id,
      slug: a.slug,
      name: a.name ?? a.slug,
      service_type: a.service_type as ServiceRow["service_type"],
      availability_status: a.availability_status as ServiceRow["availability_status"],
      price_cents: a.price_cents,
      cogs_cents: a.cogs_cents,
      vat_rate: Number(a.vat_rate),
      pricing_model: a.pricing_model as ServiceRow["pricing_model"],
      sort_order: a.sort_order,
      waitlist_count: waitlistCounts.get(a.id) ?? 0,
      stripe_price_id: a.stripe_price_id,
      updated_at: a.updated_at,
    };
  }

  const addons = allAddons.filter((a) => a.service_type === "addon").map(toServiceRow);
  const standalones = allAddons
    .filter((a) => a.service_type === "standalone" || a.service_type === "both")
    .map(toServiceRow);

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-warm-cream">Services</h1>
        <p className="text-sm text-warm-cream/50">
          {tours.length} tours · {addons.length} add-ons · {standalones.length} standalones
        </p>
      </header>

      <ServicesClient tours={tours} addons={addons} standalones={standalones} />
    </main>
  );
}
