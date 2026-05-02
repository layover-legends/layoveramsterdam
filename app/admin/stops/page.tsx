import Link from "next/link";
import { listStops } from "@/lib/admin/stops";
import { STOP_FILTERS, type StopFilter } from "@/lib/admin/stops-types";
import StopsFilters from "@/components/admin/StopsFilters";
import { getUiStrings, t, tpl } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: {
    q?: string;
    filter?: string;
    category?: string;
    page?: string;
    deleted?: string;
  };
};

function isFilter(v: string | undefined): v is StopFilter {
  return !!v && STOP_FILTERS.some((f) => f.key === v);
}

export default async function AdminStopsPage({ searchParams }: PageProps) {
  const q = (searchParams?.q ?? "").trim();
  const filter: StopFilter = isFilter(searchParams?.filter)
    ? (searchParams!.filter as StopFilter)
    : "all";
  const categorySlug = searchParams?.category || null;
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize, filterCounts, categoriesByCount }, s] =
    await Promise.all([
      listStops({ filter, categorySlug: categorySlug ?? undefined, search: q, page }),
      getUiStrings(),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const buildPageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (filter !== "all") next.set("filter", filter);
    if (categorySlug) next.set("category", categorySlug);
    if (n !== 1) next.set("page", String(n));
    const qs = next.toString();
    return qs ? `/admin/stops?${qs}` : "/admin/stops";
  };

  const filterLabel =
    filter === "free"     ? "free" :
    filter === "paid"     ? "bookable" :
    filter === "adult"    ? "adult-only" :
    filter === "inactive" ? "inactive" :
    filter === "seasonal" ? "seasonal" : "total";

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t(s, "admin.stops.title", "Stops")}
          </h1>
          <p className="text-sm text-warm-cream/60">
            {totalMatching} {filterLabel}
            {q ? ` ${tpl(t(s, "admin.stops.empty_search", "matching \"{q}\""), { q })}` : ""}
          </p>
        </div>
        <Link
          href="/admin/stops/new"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {t(s, "admin.stops.new_button", "+ New stop")}
        </Link>
      </header>

      {searchParams?.deleted === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.stops.deleted", "Stop deleted.")}
        </div>
      )}

      <StopsFilters
        initialSearch={q}
        activeFilter={filter}
        activeCategorySlug={categorySlug}
        filterCounts={filterCounts}
        categoriesByCount={categoriesByCount}
        labels={s}
      />

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.stops.col_stop", "Stop")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.stops.col_category", "Category")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.stops.col_area", "Area")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.stops.col_coords", "Coords")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.stops.col_flags", "Flags")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.stops.col_status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-warm-cream/55">
                    {q
                      ? tpl(t(s, "admin.stops.empty_search", "No stops match \"{q}\"."), { q })
                      : t(s, "admin.stops.empty_default", "No stops yet.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3 max-w-[24rem]">
                      <Link href={`/admin/stops/${row.id}`} className="block group">
                        <div className="flex items-center gap-3">
                          {row.primary_photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.primary_photo_url} alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-warm-cream/15 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-warm-cream/5 border border-warm-cream/10 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-warm-cream font-medium group-hover:text-legend-gold transition-colors truncate">{row.name}</div>
                            {row.description && (
                              <div className="text-xs text-warm-cream/55 mt-0.5 line-clamp-2">{row.description}</div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-warm-cream/80">
                      {row.category_name ?? <span className="text-warm-cream/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-warm-cream/75 whitespace-nowrap">{row.area ?? "—"}</td>
                    <td className="px-4 py-3 text-warm-cream/55 whitespace-nowrap text-xs tabular-nums">
                      {row.latitude !== null && row.longitude !== null
                        ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {row.requires_booking && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-legend-gold/20 text-legend-gold">€</span>}
                        {row.is_seasonal && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-warm-cream/10 text-warm-cream/70" title="Seasonal">SE</span>}
                        {row.is_adult_only && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-red-400/20 text-red-200" title="Adult only">18+</span>}
                        {row.wheelchair_accessible && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-emerald-400/15 text-emerald-200" title="Wheelchair accessible">♿</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                          {t(s, "admin.common.active", "Active")}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-warm-cream/10 text-warm-cream/60">
                          {t(s, "admin.common.hidden", "Hidden")}
                        </span>
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
              {page > 1 && (
                <Link href={buildPageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">
                  {t(s, "admin.pagination.prev", "← Prev")}
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildPageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">
                  {t(s, "admin.pagination.next", "Next →")}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
