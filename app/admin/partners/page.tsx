import { requireAdmin } from "@/lib/auth/require-admin";
import { listPartners } from "@/lib/admin/partners";
import { PARTNER_STATUSES } from "@/lib/admin/partners-types";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const STATUS_COLOURS: Record<string, string> = {
  pending:  "bg-amber-400/15 text-amber-200",
  active:   "bg-emerald-400/15 text-emerald-200",
  paused:   "bg-warm-cream/10 text-warm-cream/50",
  rejected: "bg-red-400/15 text-red-200",
};

type PageProps = {
  searchParams?: { status?: string; page?: string };
};

export default async function AdminPartnersPage({ searchParams }: PageProps) {
  await requireAdmin();

  const status = searchParams?.status ?? "all";
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize }, s] = await Promise.all([
    listPartners({ status, page }),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildHref = (p: number, st?: string) => {
    const qs = new URLSearchParams();
    if (st && st !== "all") qs.set("status", st);
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/partners?${qs}` : "/admin/partners";
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {t(s, "admin.partners.title", "Partners")}
        </h1>
        <p className="text-sm text-warm-cream/60">{totalMatching} total</p>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {["all", ...PARTNER_STATUSES].map((st) => (
          <a key={st} href={buildHref(1, st)}
            className={`px-3 py-1.5 rounded-full border transition-colors text-xs capitalize ${
              status === st
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}
          >
            {st}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.partners.col_name", "Partner")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.partners.col_type", "Type")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.partners.col_commission", "Commission")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.partners.col_status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-warm-cream/55">
                    {t(s, "admin.partners.empty_default", "No partners yet.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3">
                      <div className="text-warm-cream font-medium">{row.name}</div>
                      {row.contact_email && (
                        <div className="text-xs text-warm-cream/40">{row.contact_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-warm-cream/75">{row.type}</td>
                    <td className="px-4 py-3 text-warm-cream/75 tabular-nums">
                      {(row.commission_bps / 100).toFixed(1)}%
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
              {page > 1 && <a href={buildHref(page - 1, status)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">← Prev</a>}
              {page < totalPages && <a href={buildHref(page + 1, status)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">Next →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
