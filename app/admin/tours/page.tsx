import Link from "next/link";
import { listTours } from "@/lib/admin/tours";
import { TOUR_FILTERS, type TourFilter } from "@/lib/admin/tours-types";
import ToursFilters from "@/components/admin/ToursFilters";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: {
    q?: string;
    filter?: string;
    page?: string;
    deleted?: string;
  };
};

function isFilter(v: string | undefined): v is TourFilter {
  return !!v && TOUR_FILTERS.some((f) => f.key === v);
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return "Free";
  const amount = cents / 100;
  return new Intl.NumberFormat("en-NL", { style: "currency", currency }).format(amount);
}

export default async function AdminToursPage({ searchParams }: PageProps) {
  const q = (searchParams?.q ?? "").trim();
  const filter: TourFilter = isFilter(searchParams?.filter)
    ? (searchParams!.filter as TourFilter)
    : "all";
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const { rows, totalMatching, pageSize, filterCounts } = await listTours({
    filter,
    search: q,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildPageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (filter !== "all") next.set("filter", filter);
    if (n !== 1) next.set("page", String(n));
    const qs = next.toString();
    return qs ? `/admin/tours?${qs}` : "/admin/tours";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tours</h1>
          <p className="text-sm text-brand-cream/60">
            {totalMatching} {filter !== "all" ? filter : "total"}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <Link
          href="/admin/tours/new"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          + New tour
        </Link>
      </header>

      {searchParams?.deleted === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Tour deleted.
        </div>
      )}

      <ToursFilters
        initialSearch={q}
        activeFilter={filter}
        filterCounts={filterCounts}
      />

      <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-brand-cream/[0.04] text-xs uppercase tracking-wide text-brand-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tour</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Stops</th>
                <th className="px-4 py-3 text-left font-medium">Flags</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-brand-cream/55">
                    {q ? `No tours match "${q}".` : "No tours yet. Create the first one!"}
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="hover:bg-brand-cream/[0.03]">
                    <td className="px-4 py-3 max-w-[24rem]">
                      <Link href={`/admin/tours/${t.id}`} className="block group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-base flex-shrink-0">
                            ◆
                          </div>
                          <div className="min-w-0">
                            <div className="text-brand-cream font-medium group-hover:text-brand-orange transition-colors truncate">
                              {t.name}
                            </div>
                            {t.tagline && (
                              <div className="text-xs text-brand-cream/55 mt-0.5 truncate">
                                {t.tagline}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-cream/75 tabular-nums">
                      {t.duration_hours !== null ? `${t.duration_hours}h` : <span className="text-brand-cream/40">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-cream/80 tabular-nums">
                      {formatPrice(t.price_cents, t.currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-cream/75 tabular-nums">
                      {t.stop_count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {t.requires_booking && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-orange/20 text-brand-orange">€</span>
                        )}
                        {t.is_seasonal && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-cream/10 text-brand-cream/70" title="Seasonal">SE</span>
                        )}
                        {t.is_adult_only && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-red-400/20 text-red-200" title="Adult only">18+</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-cream/10 text-brand-cream/60">Draft</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-cream/10 text-xs text-brand-cream/60">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link href={buildPageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-brand-cream/15 hover:bg-brand-cream/5 transition-colors">
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildPageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-brand-cream/15 hover:bg-brand-cream/5 transition-colors">
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
