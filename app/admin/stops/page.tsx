import Link from "next/link";
import {
  listFreeStops,
  CATEGORY_META,
  ALL_CATEGORIES,
  type FreeStopCategory,
} from "@/lib/admin/stops";
import StopsFilters from "@/components/admin/StopsFilters";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { q?: string; category?: string; page?: string };
};

function isValidCategory(v: string | undefined): v is FreeStopCategory {
  return !!v && (ALL_CATEGORIES as string[]).includes(v);
}

export default async function AdminStopsPage({ searchParams }: PageProps) {
  const q = (searchParams?.q ?? "").trim();
  const categoryParam = searchParams?.category;
  const category = isValidCategory(categoryParam) ? categoryParam : undefined;
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const { rows, totalMatching, pageSize, countsByCategory } = await listFreeStops({
    category,
    search: q,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const buildPageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (n !== 1) next.set("page", String(n));
    const qs = next.toString();
    return qs ? `/admin/stops?${qs}` : "/admin/stops";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Free stops
          </h1>
          <p className="text-sm text-brand-cream/60">
            {totalMatching} {category ? CATEGORY_META[category].label.toLowerCase() : "total"}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
      </header>

      <StopsFilters
        initialSearch={q}
        activeCategory={category ?? null}
        countsByCategory={countsByCategory}
      />

      <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-brand-cream/[0.04] text-xs uppercase tracking-wide text-brand-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Stop</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Neighborhood</th>
                <th className="px-4 py-3 text-left font-medium">Coords</th>
                <th className="px-4 py-3 text-left font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-brand-cream/55"
                  >
                    {q ? `No stops match "${q}".` : "No stops yet."}
                  </td>
                </tr>
              ) : (
                rows.map((s) => {
                  const meta = CATEGORY_META[s.category];
                  return (
                    <tr key={s.id} className="hover:bg-brand-cream/[0.03]">
                      <td className="px-4 py-3 max-w-[24rem]">
                        <div className="text-brand-cream font-medium">
                          {s.name}
                        </div>
                        {s.description && (
                          <div className="text-xs text-brand-cream/55 mt-0.5 line-clamp-2">
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-brand-cream/80">
                          <span aria-hidden>{meta.emoji}</span>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-cream/75 whitespace-nowrap">
                        {s.neighborhood ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-brand-cream/55 whitespace-nowrap text-xs tabular-nums">
                        {s.lat !== null && s.lng !== null
                          ? `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`
                          : "— missing —"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.is_active ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-cream/10 text-brand-cream/60">
                            Hidden
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-cream/10 text-xs text-brand-cream/60">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildPageHref(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-brand-cream/15 hover:bg-brand-cream/5 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildPageHref(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-brand-cream/15 hover:bg-brand-cream/5 transition-colors"
                >
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
