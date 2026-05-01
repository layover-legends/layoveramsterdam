import Link from "next/link";
import { listStops } from "@/lib/admin/stops";
import {
  STOP_FILTERS,
  type StopFilter,
} from "@/lib/admin/stops-types";
import StopsFilters from "@/components/admin/StopsFilters";

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

  const {
    rows,
    totalMatching,
    pageSize,
    filterCounts,
    categoriesByCount,
  } = await listStops({
    filter,
    categorySlug: categorySlug ?? undefined,
    search: q,
    page,
  });
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stops</h1>
          <p className="text-sm text-brand-cream/60">
            {totalMatching}{" "}
            {filter === "free"
              ? "free"
              : filter === "paid"
              ? "bookable"
              : filter === "adult"
              ? "adult-only"
              : filter === "inactive"
              ? "inactive"
              : filter === "seasonal"
              ? "seasonal"
              : "total"}
            {q ? ` matching "${q}"` : ""}
            {categorySlug ? ` in this category` : ""}
            {" — use filters below to browse free, paid & after-dark"}
          </p>
        </div>
        <Link
          href="/admin/stops/new"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          + New stop
        </Link>
      </header>

      {searchParams?.deleted === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Stop deleted.
        </div>
      )}

      <StopsFilters
        initialSearch={q}
        activeFilter={filter}
        activeCategorySlug={categorySlug}
        filterCounts={filterCounts}
        categoriesByCount={categoriesByCount}
      />

      <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-brand-cream/[0.04] text-xs uppercase tracking-wide text-brand-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Stop</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Area</th>
                <th className="px-4 py-3 text-left font-medium">Coords</th>
                <th className="px-4 py-3 text-left font-medium">Flags</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-brand-cream/55">
                    {q ? `No stops match "${q}".` : "No stops yet."}
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-cream/[0.03]">
                    <td className="px-4 py-3 max-w-[24rem]">
                      <Link href={`/admin/stops/${s.id}`} className="block group">
                        <div className="flex items-center gap-3">
                          {s.primary_photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.primary_photo_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-brand-cream/15 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-brand-cream/5 border border-brand-cream/10 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-brand-cream font-medium group-hover:text-brand-orange transition-colors truncate">
                              {s.name}
                            </div>
                            {s.description && (
                              <div className="text-xs text-brand-cream/55 mt-0.5 line-clamp-2">
                                {s.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-cream/80">
                      {s.category_name ?? <span className="text-brand-cream/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-brand-cream/75 whitespace-nowrap">
                      {s.area ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-cream/55 whitespace-nowrap text-xs tabular-nums">
                      {s.latitude !== null && s.longitude !== null
                        ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {s.requires_booking && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-orange/20 text-brand-orange">€</span>
                        )}
                        {s.is_seasonal && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-cream/10 text-brand-cream/70" title="Seasonal">SE</span>
                        )}
                        {s.is_adult_only && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-red-400/20 text-red-200" title="Adult only">18+</span>
                        )}
                        {s.wheelchair_accessible && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-emerald-400/15 text-emerald-200" title="Wheelchair accessible">♿</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {s.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-cream/10 text-brand-cream/60">Hidden</span>
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
