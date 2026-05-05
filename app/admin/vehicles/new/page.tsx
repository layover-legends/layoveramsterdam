import { requireAdmin } from "@/lib/auth/require-admin";
import { upsertVehicle } from "@/app/admin/vehicles/actions";
import { getUiStrings, t } from "@/lib/i18n/ui";
import Link from "next/link";
import VehicleForm from "@/components/admin/VehicleForm";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  await requireAdmin();
  const s = await getUiStrings();
  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <Link href="/admin/vehicles" className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
          ← {t(s, "admin.vehicles.title", "Vehicles")}
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {t(s, "admin.vehicles.new_heading", "Add vehicle")}
        </h1>
      </header>
      <VehicleForm action={upsertVehicle} labels={s} />
    </div>
  );
}
