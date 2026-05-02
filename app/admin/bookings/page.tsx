import { requireAdmin } from "@/lib/auth/require-admin";
import { listBookings } from "@/lib/admin/bookings";
import { BOOKING_STATUSES } from "@/lib/admin/bookings-types";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const STATUS_COLOURS: Record<string, string> = {
  pending_payment: "bg-amber-400/15 text-amber-200",
  confirmed:       "bg-emerald-400/15 text-emerald-200",
  in_progress:     "bg-canal-blue/30 text-canal-light",
  completed:       "bg-emerald-400/15 text-emerald-200",
  cancelled:       "bg-warm-cream/10 text-warm-cream/50",
  refunded:        "bg-warm-cream/10 text-warm-cream/50",
  no_show:         "bg-red-400/15 text-red-200",
};

type PageProps = {
  searchParams?: { status?: string; page?: string };
};

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const status = searchParams?.status ?? "all";
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize, totalRevenueCents }, s] = await Promise.all([
    listBookings({ status, page }),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const formatMoney = (cents: number, currency = "EUR") =>
    new Intl.NumberFormat("en-NL", { style: "currency", currency }).format(cents / 100);

  const buildHref = (p: number, st?: string) => {
    const qs = new URLSearchParams();
    if (st && st !== "all") qs.set("status", st);
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/bookings?${qs}` : "/admin/bookings";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {t(s, "admin.bookings.title", "Bookings")}
          </h1>
          <p className="text-sm text-warm-cream/60">{totalMatching} total</p>
        </div>
        <div className="rounded-xl border border-legend-gold/20 bg-legend-gold/5 px-5 py-3 text-right">
          <p className="text-xs text-warm-cream/40 uppercase tracking-wider">{t(s, "admin.bookings.revenue_label", "Revenue (shown)")}</p>
          <p className="font-display text-xl font-semibold text-legend-gold">{formatMoney(totalRevenueCents)}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {["all", ...BOOKING_STATUSES].map((st) => (
          <a key={st} href={buildHref(1, st)}
            className={`px-3 py-1.5 rounded-full border transition-colors text-xs ${
              status === st
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}
          >
            {st.replace(/_/g, " ")}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.bookings.col_tour", "Tour")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.bookings.col_pickup", "Pickup")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.bookings.col_party", "Party")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.bookings.col_total", "Total")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.bookings.col_status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-warm-cream/55">
                    {t(s, "admin.bookings.empty_default", "No bookings yet.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3">
                      <div className="text-warm-cream font-medium">{row.tour_name ?? "—"}</div>
                      <div className="text-xs text-warm-cream/40">{row.user_email ?? "Guest"}</div>
                    </td>
                    <td className="px-4 py-3 text-warm-cream/75 text-xs whitespace-nowrap">
                      {new Date(row.scheduled_pickup_at).toLocaleString("en-NL", { timeZone: "Europe/Amsterdam", dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-warm-cream/75 tabular-nums">{row.party_size}</td>
                    <td className="px-4 py-3 font-display text-legend-gold font-semibold tabular-nums">
                      {formatMoney(row.total_cents, row.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOURS[row.status] ?? "bg-warm-cream/10 text-warm-cream/60"}`}>
                        {row.status.replace(/_/g, " ")}
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
