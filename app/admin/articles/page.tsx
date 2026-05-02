import Link from "next/link";
import { listArticles } from "@/lib/admin/articles";
import { ARTICLE_FILTERS, type ArticleFilter } from "@/lib/admin/articles-types";
import { getUiStrings, t, tpl } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { q?: string; filter?: string; page?: string; deleted?: string };
};

function isFilter(v: string | undefined): v is ArticleFilter {
  return !!v && ARTICLE_FILTERS.some((f) => f.key === v);
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  const q = (searchParams?.q ?? "").trim();
  const filter: ArticleFilter = isFilter(searchParams?.filter) ? (searchParams!.filter as ArticleFilter) : "all";
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize, filterCounts }, s] = await Promise.all([
    listArticles({ filter, search: q, page }),
    getUiStrings(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));

  const buildHref = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (filter !== "all") p.set("filter", filter);
    if (n !== 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/admin/articles?${qs}` : "/admin/articles";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{t(s, "admin.articles.title", "Articles")}</h1>
          <p className="text-sm text-warm-cream/60">
            {totalMatching} {filter === "published" ? "published" : filter === "draft" ? "draft" : "total"}
            {q ? ` ${tpl(t(s, "admin.articles.empty_search", "matching \"{q}\""), { q })}` : ""}
          </p>
        </div>
        <Link href="/admin/articles/new"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
          {t(s, "admin.articles.new_button", "+ New article")}
        </Link>
      </header>

      {searchParams?.deleted === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.articles.deleted", "Article deleted.")}
        </div>
      )}

      <div className="space-y-3">
        <input
          type="search"
          defaultValue={q}
          placeholder={t(s, "admin.articles.search_placeholder", "Search title or excerpt…")}
          className="w-full sm:max-w-md px-4 py-2.5 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/60"
          onKeyDown={undefined}
        />
        <div className="flex flex-wrap gap-2">
          {ARTICLE_FILTERS.map((f) => {
            const isActive = filter === f.key;
            const p = new URLSearchParams();
            if (q) p.set("q", q);
            if (f.key !== "all") p.set("filter", f.key);
            const href = p.toString() ? `/admin/articles?${p}` : "/admin/articles";
            return (
              <Link key={f.key} href={href}
                className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap " +
                  (isActive ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold" : "border-warm-cream/15 text-warm-cream/70 hover:bg-warm-cream/5")}>
                {f.label}
                <span className="text-warm-cream/50 tabular-nums">{filterCounts[f.key]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.articles.col_article", "Article")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.articles.col_status", "Status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.articles.col_published", "Published")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.articles.col_updated", "Updated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-warm-cream/55">
                    {q
                      ? tpl(t(s, "admin.articles.empty_search", "No articles match \"{q}\"."), { q })
                      : t(s, "admin.articles.empty_default", "No articles yet. Write your first one!")}
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3 max-w-[28rem]">
                      <Link href={`/admin/articles/${a.id}`} className="block group">
                        <div className="flex items-center gap-3">
                          {a.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.cover_url} alt="" className="w-12 h-10 rounded-lg object-cover border border-warm-cream/10 flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-10 rounded-lg bg-warm-cream/5 border border-warm-cream/10 flex-shrink-0 flex items-center justify-center text-warm-cream/20 text-lg">✍</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-warm-cream font-medium group-hover:text-legend-gold transition-colors truncate">{a.title}</p>
                            {a.excerpt && <p className="text-xs text-warm-cream/50 mt-0.5 truncate">{a.excerpt}</p>}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.is_published
                        ? <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">{t(s, "admin.articles.status_published", "Published")}</span>
                        : <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-warm-cream/10 text-warm-cream/60">{t(s, "admin.articles.status_draft", "Draft")}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-warm-cream/55 text-xs tabular-nums">{fmt(a.published_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-warm-cream/55 text-xs tabular-nums">{fmt(a.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-warm-cream/10 text-xs text-warm-cream/60">
            <span>{tpl(t(s, "admin.pagination.page", "Page {page} of {total}"), { page, total: totalPages })}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={buildHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">{t(s, "admin.pagination.prev", "← Prev")}</Link>}
              {page < totalPages && <Link href={buildHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">{t(s, "admin.pagination.next", "Next →")}</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
