import { requireAdmin } from "@/lib/auth/require-admin";
import { listStaff } from "@/lib/admin/staff";
import { STAFF_ROLES, STAFF_STATUSES } from "@/lib/admin/staff-types";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const STATUS_COLOURS: Record<string, string> = {
  active:      "bg-emerald-400/15 text-emerald-200",
  inactive:    "bg-warm-cream/10 text-warm-cream/50",
  suspended:   "bg-red-400/15 text-red-200",
  onboarding:  "bg-amber-400/15 text-amber-200",
};

type PageProps = {
  searchParams?: { role?: string; page?: string };
};

export default async function AdminStaffPage({ searchParams }: PageProps) {
  await requireAdmin();

  const role = searchParams?.role ?? "all";
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize }, s] = await Promise.all([
    listStaff({ role, page }),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildHref = (p: number, r?: string) => {
    const qs = new URLSearchParams();
    if (r && r !== "all") qs.set("role", r);
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
          <p className="text-sm text-warm-cream/60">{totalMatching} total</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {["all", ...STAFF_ROLES].map((r) => (
          <a key={r} href={buildHref(1, r)}
            className={`px-3 py-1.5 rounded-full border transition-colors text-xs capitalize ${
              role === r
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}
          >
            {r}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.staff.col_person", "Person")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.staff.col_role", "Role")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.staff.col_certified", "Certified")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.staff.col_status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-warm-cream/55">
                    {t(s, "admin.staff.empty_default", "No staff yet.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3 text-warm-cream/80 text-xs">
                      {row.user_email ?? <span className="text-warm-cream/40">No account linked</span>}
                    </td>
                    <td className="px-4 py-3 capitalize text-warm-cream/75">{row.role}</td>
                    <td className="px-4 py-3 text-warm-cream/60 text-xs">
                      {row.certified_at
                        ? new Date(row.certified_at).toLocaleDateString("en-NL")
                        : <span className="text-warm-cream/30">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_COLOURS[row.status] ?? "bg-warm-cream/10 text-warm-cream/60"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
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
