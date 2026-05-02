import { requireAdmin } from "@/lib/auth/require-admin";
import { listLayovers } from "@/lib/admin/layovers";
import { LAYOVER_STATUSES } from "@/lib/admin/layovers-types";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const STATUS_COLOURS: Record<string, string> = {
  submitted: "bg-amber-400/15 text-amber-200",
  matched:   "bg-canal-blue/30 text-canal-light",
  converted: "bg-emerald-400/15 text-emerald-200",
  expired:   "bg-warm-cream/10 text-warm-cream/50",
  cancelled: "bg-warm-cream/10 text-warm-cream/50",
};

type PageProps = {
  searchParams?: { status?: string; page?: string };
};

export default async function AdminLayoversPage({ searchParams }: PageProps) {
  await requireAdmin();

  const status = searchParams?.status ?? "all";
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize }, s] = await Promise.all([
    listLayovers({ status, page }),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildHref = (p: number, st?: string) => {
    const qs = new URLSearchParams();
    if (st && st !== "all") qs.set("status", st);
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/layovers?${qs}` : "/admin/layovers";
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {t(s, "admin.layovers.title", "Layovers")}
        </h1>
        <p className="text-sm text-warm-cream/60">{totalMatching} total</p>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {["all", ...LAYOVER_STATUSES].map((st) => (
          <a key={st} href={buildHref(1, st)}
            className={`px-3 py-1.5 rounded-full border transition-colors capitalize ${
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
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.layovers.col_flights", "Flights")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.layovers.col_party", "Party")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.layovers.col_user", "User")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.layovers.col_status", "Status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.layovers.col_created", "Created")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-warm-cream/55">
                    {t(s, "admin.layovers.empty_default", "No layovers yet.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-warm-cream/80 space-y-0.5">
                        <div>{row.arrival_flight ?? "—"} → {row.departure_flight ?? "—"}</div>
                        <div className="text-warm-cream/40">
                          {new Date(row.flight_in_at).toLocaleString("en-NL", { timeZone: "Europe/Amsterdam", dateStyle: "short", timeStyle: "short" })}
                          {" — "}
                          {new Date(row.flight_out_at).toLocaleString("en-NL", { timeZone: "Europe/Amsterdam", timeStyle: "short" })}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-warm-cream/75 tabular-nums">{row.party_size}</td>
                    <td className="px-4 py-3 text-warm-cream/60 text-xs truncate max-w-[12rem]">
                      {row.user_email ?? <span className="text-warm-cream/30">Guest</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_COLOURS[row.status] ?? "bg-warm-cream/10 text-warm-cream/60"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-warm-cream/50 text-xs tabular-nums whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString("en-NL")}
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
              {page > 1 && <a href={buildHref(page - 1, status)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">← Prev</a>}
              {page < totalPages && <a href={buildHref(page + 1, status)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">Next →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
