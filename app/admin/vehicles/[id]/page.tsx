import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getVehicleById } from "@/lib/admin/vehicles";
import { upsertVehicle, deactivateVehicle } from "@/app/admin/vehicles/actions";
import { getUiStrings, t } from "@/lib/i18n/ui";
import VehicleForm from "@/components/admin/VehicleForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
};

export default async function EditVehiclePage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const [v, s] = await Promise.all([getVehicleById(params.id), getUiStrings()]);
  if (!v) notFound();

  const saved = searchParams?.saved === "1";
  const error = searchParams?.error;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <Link href="/admin/vehicles" className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
          ← {t(s, "admin.vehicles.title", "Vehicles")}
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{v.nickname}</h1>
        <p className="text-xs text-warm-cream/50 capitalize">
          {v.vehicle_type.replace(/_/g, " ")}
          {v.license_plate ? ` · ${v.license_plate}` : ""}
          {v.seats ? ` · ${v.seats} seats` : ""}
          {" · "}{v.is_active ? "Active" : "Inactive"}
        </p>
      </header>

      {saved && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.common.saved", "Saved.")}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {decodeURIComponent(error)}
        </div>
      )}

      <VehicleForm action={upsertVehicle} labels={s} defaults={v} vehicleId={v.id} />

      {v.is_active && (
        <div className="pt-8 border-t border-warm-cream/10">
          <h3 className="text-sm font-semibold text-warm-cream/60 mb-3">Danger zone</h3>
          <form action={deactivateVehicle}>
            <input type="hidden" name="id" value={v.id} />
            <button type="submit"
              className="px-5 py-2 rounded-full border border-red-400/30 text-red-400/80 text-sm hover:bg-red-400/10 transition-colors">
              Deactivate vehicle
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
