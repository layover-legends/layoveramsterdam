import Link from "next/link";
import { listTours } from "@/lib/admin/tours";
import { TOUR_FILTERS, type TourFilter } from "@/lib/admin/tours-types";
import ToursFilters from "@/components/admin/ToursFilters";
import { getUiStrings, t, tpl } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { q?: string; filter?: string; page?: string; deleted?: string };
};

function isFilter(v: string | undefined): v is TourFilter {
  return !!v && TOUR_FILTERS.some((f) => f.key === v);
}

function formatPrice(cents: number | null, currency: string, freeLabel: string): string {
  if (cents === null) return freeLabel;
  return new Intl.NumberFormat("en-NL", { style: "currency", currency }).format(cents / 100);
}

export default async function AdminToursPage({ searchParams }: PageProps) {
  const q = (searchParams?.q ?? "").trim();
  const filter: TourFilter = isFilter(searchParams?.filter) ? (searchParams!.filter as TourFilter) : "all";
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize, filterCounts }, s] = await Promise.all([
    listTours({ filter, search: q, page }),
    getUiStrings(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildPageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (filter !== "all") next.set("filter", filter);
    if (n !== 1) next.set("page", String(n));
    const qs = next.toString();
    return qs ? `/admin/tours?${qs}` : "/admin/tours";
  };

  const freeLabel = t(s, "admin.tours.price_free", "Free");

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t(s, "admin.tours.title", "Tours")}</h1>
          <p className="text-sm text-warm-cream/60">
            {totalMatching} {filter !== "all" ? filter : "total"}
            {q ? ` ${tpl(t(s, "admin.tours.empty_search", "matching \"{q}\""), { q })}` : ""}
          </p>
        </div>
        <Link href="/admin/tours/new"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
          {t(s, "admin.tours.new_button", "+ New tour")}
        </Link>
      </header>

      {searchParams?.deleted === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.tours.deleted", "Tour deleted.")}
        </div>
      )}

      <ToursFilters initialSearch={q} activeFilter={filter} filterCounts={filterCounts} labels={s} />

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.tours.col_tour", "Tour")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.tours.col_duration", "Duration")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.tours.col_price", "Price")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.tours.col_stops", "Stops")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.tours.col_flags", "Flags")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.tours.col_status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-warm-cream/55">
                    {q
                      ? tpl(t(s, "admin.tours.empty_search", "No tours match \"{q}\"."), { q })
                      : t(s, "admin.tours.empty_default", "No tours yet. Create the first one!")}
                  </td>
                </tr>
              ) : (
                rows.map((tour) => (
                  <tr key={tour.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3 max-w-[24rem]">
                      <Link href={`/admin/tours/${tour.id}`} className="block group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-legend-gold/10 border border-legend-gold/20 flex items-center justify-center text-base flex-shrink-0">◆</div>
                          <div className="min-w-0">
                            <div className="text-warm-cream font-medium group-hover:text-legend-gold transition-colors truncate">{tour.name}</div>
                            {tour.tagline && <div className="text-xs text-warm-cream/55 mt-0.5 truncate">{tour.tagline}</div>}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-warm-cream/75 tabular-nums">
                      {tour.duration_hours !== null ? `${tour.duration_hours}h` : <span className="text-warm-cream/40">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-warm-cream/80 tabular-nums">
                      {formatPrice(tour.price_cents, tour.currency, freeLabel)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-warm-cream/75 tabular-nums">{tour.stop_count}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {tour.requires_booking && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-legend-gold/20 text-legend-gold">€</span>}
                        {tour.is_seasonal && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-warm-cream/10 text-warm-cream/70" title="Seasonal">SE</span>}
                        {tour.is_adult_only && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-red-400/20 text-red-200" title="Adult only">18+</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tour.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">{t(s, "admin.common.active", "Active")}</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-warm-cream/10 text-warm-cream/60">{t(s, "admin.common.draft", "Draft")}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-warm-cream/10 text-xs text-warm-cream/60">
            <span>{tpl(t(s, "admin.pagination.page", "Page {page} of {total}"), { page, total: totalPages })}</span>
            <div className="flex items-center gap-2">
              {page > 1 && <Link href={buildPageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">{t(s, "admin.pagination.prev", "← Prev")}</Link>}
              {page < totalPages && <Link href={buildPageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">{t(s, "admin.pagination.next", "Next →")}</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
