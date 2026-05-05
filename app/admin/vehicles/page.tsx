import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listVehicles } from "@/lib/admin/vehicles";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/admin/vehicles-types";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { type?: string; page?: string; deleted?: string; inactive?: string };
};

function expiryBadge(dateStr: string | null): { label: string; css: string } | null {
  if (!dateStr) return null;
  const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "EXPIRED",     css: "bg-red-500/20 text-red-300 border-red-500/30" };
  if (days < 30) return { label: `${days}d`,    css: "bg-orange-400/20 text-orange-300 border-orange-400/30" };
  if (days < 90) return { label: `${days}d`,    css: "bg-amber-400/20 text-amber-200 border-amber-400/30" };
  return null;
}

function serviceBadge(odometer: number | null, lastKm: number | null, intervalKm: number): { label: string; css: string } | null {
  if (!odometer || !lastKm) return null;
  const driven = odometer - lastKm;
  const ratio = driven / intervalKm;
  if (ratio >= 1)    return { label: "SERVICE DUE",  css: "bg-red-500/20 text-red-300 border-red-500/30" };
  if (ratio >= 0.8)  return { label: `${Math.round(driven)}km`,  css: "bg-orange-400/20 text-orange-300 border-orange-400/30" };
  return null;
}

export default async function AdminVehiclesPage({ searchParams }: PageProps) {
  await requireAdmin();

  const vtype      = searchParams?.type ?? "all";
  const page       = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const showInactive = searchParams?.inactive === "1";

  const [{ rows, totalMatching, pageSize }, s] = await Promise.all([
    listVehicles({ showInactive, page }),
    getUiStrings(),
  ]);

  const filtered = vtype === "all" ? rows : rows.filter((r) => r.vehicle_type === vtype);
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildHref = (p: number, vt?: string) => {
    const qs = new URLSearchParams();
    if (vt && vt !== "all") qs.set("type", vt);
    if (showInactive) qs.set("inactive", "1");
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/vehicles?${qs}` : "/admin/vehicles";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {t(s, "admin.vehicles.title", "Vehicles")}
          </h1>
          <p className="text-sm text-warm-cream/60">{totalMatching} {showInactive ? "total" : "active"}</p>
        </div>
        <div className="flex gap-3">
          <a href={showInactive ? "/admin/vehicles" : "/admin/vehicles?inactive=1"}
            className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors self-end pb-0.5">
            {showInactive ? "Hide inactive" : "Show inactive"}
          </a>
          <Link href="/admin/vehicles/new"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold hover:bg-gold-light transition-colors">
            {t(s, "admin.vehicles.new_button", "+ Add vehicle")}
          </Link>
        </div>
      </header>

      {searchParams?.deleted === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Vehicle deactivated.
        </div>
      )}

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...VEHICLE_TYPE_OPTIONS].map((v) => (
          <a key={v.value} href={buildHref(1, v.value)}
            className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
              vtype === v.value
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}>
            {v.label}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-warm-cream/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium">Plate</th>
                <th className="px-4 py-3 text-left font-medium">Seats</th>
                <th className="px-4 py-3 text-left font-medium">APK</th>
                <th className="px-4 py-3 text-left font-medium">Insurance</th>
                <th className="px-4 py-3 text-left font-medium">Service</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-warm-cream/40">
                    {t(s, "admin.vehicles.empty", "No vehicles yet. Add your van to get started.")}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const apkAlert  = expiryBadge(v.apk_expiry);
                  const insAlert  = expiryBadge(v.insurance_expiry);
                  const svcAlert  = serviceBadge(v.odometer_km, v.last_service_km, v.service_interval_km);

                  return (
                    <tr key={v.id} className="hover:bg-warm-cream/[0.03]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-warm-cream/90">{v.nickname}</div>
                        <div className="text-xs text-warm-cream/45 mt-0.5 capitalize">
                          {v.vehicle_type.replace(/_/g, " ")}
                          {v.make ? ` · ${v.make}${v.model ? " " + v.model : ""}` : ""}
                          {v.year ? ` · ${v.year}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-warm-cream/70">
                        {v.license_plate ?? <span className="text-warm-cream/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-warm-cream/60 text-center">
                        {v.seats ?? <span className="text-warm-cream/30">—</span>}
                        {v.wheelchair_accessible && <span className="ml-1 text-[10px] text-canal-light">♿</span>}
                      </td>
                      <td className="px-4 py-3">
                        {apkAlert
                          ? <span className={`text-[10px] px-1.5 py-0.5 rounded border ${apkAlert.css}`}>{apkAlert.label}</span>
                          : v.apk_expiry
                            ? <span className="text-xs text-emerald-400/60">{new Date(v.apk_expiry).toLocaleDateString("nl-NL")}</span>
                            : <span className="text-warm-cream/30 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {insAlert
                          ? <span className={`text-[10px] px-1.5 py-0.5 rounded border ${insAlert.css}`}>{insAlert.label}</span>
                          : v.insurance_expiry
                            ? <span className="text-xs text-emerald-400/60">{new Date(v.insurance_expiry).toLocaleDateString("nl-NL")}</span>
                            : <span className="text-warm-cream/30 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {svcAlert
                          ? <span className={`text-[10px] px-1.5 py-0.5 rounded border ${svcAlert.css}`}>{svcAlert.label}</span>
                          : v.odometer_km
                            ? <span className="text-xs text-emerald-400/60">{v.odometer_km.toLocaleString()}km</span>
                            : <span className="text-warm-cream/30 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/vehicles/${v.id}`}
                          className="text-xs text-legend-gold hover:text-gold-light transition-colors">
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-warm-cream/10 text-xs text-warm-cream/60">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1     && <a href={buildHref(page - 1, vtype)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">← Prev</a>}
              {page < totalPages && <a href={buildHref(page + 1, vtype)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">Next →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
