import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listStaff } from "@/lib/admin/staff";
import { STAFF_ROLE_OPTIONS } from "@/lib/admin/staff-types";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { role?: string; page?: string; deleted?: string; inactive?: string };
};

function expiryBadge(dateStr: string | null): { label: string; css: string } | null {
  if (!dateStr) return null;
  const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "EXPIRED",   css: "bg-red-500/20 text-red-300 border-red-500/30" };
  if (days < 30) return { label: `${days}d`,   css: "bg-orange-400/20 text-orange-300 border-orange-400/30" };
  if (days < 90) return { label: `${days}d`,   css: "bg-amber-400/20 text-amber-200 border-amber-400/30" };
  return null;
}

export default async function AdminStaffPage({ searchParams }: PageProps) {
  await requireAdmin();

  const role         = searchParams?.role ?? "all";
  const page         = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const showInactive = searchParams?.inactive === "1";

  const [{ rows, totalMatching, pageSize }, s] = await Promise.all([
    listStaff({ role, showInactive, page }),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildHref = (p: number, r?: string) => {
    const qs = new URLSearchParams();
    if (r && r !== "all") qs.set("role", r);
    if (showInactive) qs.set("inactive", "1");
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/staff?${qs}` : "/admin/staff";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {t(s, "admin.staff.title", "Staff")}
          </h1>
          <p className="text-sm text-warm-cream/60">{totalMatching} {showInactive ? "total (incl. inactive)" : "active"}</p>
        </div>
        <div className="flex gap-3">
          <a
            href={showInactive ? "/admin/staff" : "/admin/staff?inactive=1"}
            className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors self-end pb-0.5"
          >
            {showInactive ? "Hide inactive" : "Show inactive"}
          </a>
          <Link
            href="/admin/staff/new"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold hover:bg-gold-light transition-colors"
          >
            {t(s, "admin.staff.new_button", "+ Add staff")}
          </Link>
        </div>
      </header>

      {searchParams?.deleted === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Staff member deactivated.
        </div>
      )}

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[{ value: "all", label: "All" }, ...STAFF_ROLE_OPTIONS].map((r) => (
          <a key={r.value} href={buildHref(1, r.value)}
            className={`px-3 py-1.5 rounded-full border transition-colors text-xs ${
              role === r.value
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}
          >
            {r.label}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-warm-cream/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Max tours/day</th>
                <th className="px-4 py-3 text-left font-medium">Compliance</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-warm-cream/40">
                    {t(s, "admin.staff.empty_default", "No staff yet. Add yourself first to validate the flow.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const licenseAlert = expiryBadge(row.driving_license_expiry);
                  const taxiAlert    = expiryBadge(row.taxi_pas_expiry);
                  const firstAidAlert= expiryBadge(row.first_aid_cert_expiry);
                  const hasAlert     = licenseAlert || taxiAlert || firstAidAlert;

                  return (
                    <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-warm-cream/90">
                          {row.preferred_name || row.full_name || "—"}
                        </div>
                        {row.user_email && (
                          <div className="text-xs text-warm-cream/40 mt-0.5">{row.user_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-warm-cream/70 capitalize text-sm">
                        {row.role.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-warm-cream/60 text-xs">
                        {row.phone ?? <span className="text-warm-cream/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-warm-cream/60 text-center">
                        {row.max_tours_per_day}
                      </td>
                      <td className="px-4 py-3">
                        {hasAlert ? (
                          <div className="flex flex-wrap gap-1">
                            {licenseAlert && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${licenseAlert.css}`}>
                                DL {licenseAlert.label}
                              </span>
                            )}
                            {taxiAlert && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${taxiAlert.css}`}>
                                Taxi {taxiAlert.label}
                              </span>
                            )}
                            {firstAidAlert && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${firstAidAlert.css}`}>
                                FA {firstAidAlert.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-400/60">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/staff/${row.id}`}
                          className="text-xs text-legend-gold hover:text-gold-light transition-colors"
                        >
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
              {page > 1 && <a href={buildHref(page - 1, role)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">← Prev</a>}
              {page < totalPages && <a href={buildHref(page + 1, role)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">Next →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
