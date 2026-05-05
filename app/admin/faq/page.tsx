import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listFaq } from "@/lib/admin/faq";
import { FAQ_CATEGORIES } from "@/lib/admin/faq-types";
import { getUiStrings } from "@/lib/i18n/ui";
import { saveFaqEntry, toggleFaqActive, hardDeleteFaq } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: { category?: string; page?: string; saved?: string; deleted?: string; inactive?: string } };

export default async function AdminFaqPage({ searchParams }: PageProps) {
  await requireAdmin();
  const category     = searchParams?.category ?? "all";
  const page         = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const showInactive = searchParams?.inactive === "1";

  const [{ rows, totalMatching, pageSize }, s] = await Promise.all([
    listFaq({ category: category === "all" ? undefined : category, showInactive, page }),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const buildHref  = (p: number, cat?: string) => {
    const qs = new URLSearchParams();
    const c = cat ?? category;
    if (c !== "all") qs.set("category", c);
    if (showInactive) qs.set("inactive", "1");
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/faq?${qs}` : "/admin/faq";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">FAQ</h1>
          <p className="text-sm text-warm-cream/60">{totalMatching} entries</p>
        </div>
        <div className="flex gap-3">
          <a href={showInactive ? "/admin/faq" : "/admin/faq?inactive=1"}
            className="text-xs text-warm-cream/50 hover:text-warm-cream/70 self-end pb-0.5">
            {showInactive ? "Hide inactive" : "Show inactive"}
          </a>
          <Link href="/admin/faq/new"
            className="px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
            + New question
          </Link>
        </div>
      </header>

      {searchParams?.saved    === "1" && <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">Saved.</div>}
      {searchParams?.deleted  === "1" && <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">Deleted.</div>}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...FAQ_CATEGORIES].map((cat) => (
          <a key={cat.value} href={buildHref(1, cat.value)}
            className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
              category === cat.value
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}>
            {cat.label}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-warm-cream/10 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Question</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-cream/10">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-warm-cream/40">No FAQ entries yet.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                <td className="px-4 py-3 text-warm-cream/85 text-sm max-w-sm">
                  <p className="truncate">{row.question}</p>
                  <p className="text-xs text-warm-cream/40 mt-0.5 truncate">{row.answer.slice(0, 80)}…</p>
                </td>
                <td className="px-4 py-3 text-warm-cream/60 capitalize text-xs">
                  {row.category.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-warm-cream/50 text-center">{row.sort_order}</td>
                <td className="px-4 py-3">
                  <form action={toggleFaqActive}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="is_active" value={String(row.is_active)} />
                    <button type="submit"
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        row.is_active
                          ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
                          : "bg-warm-cream/10 text-warm-cream/50 border-warm-cream/20"
                      }`}>
                      {row.is_active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/faq/${row.id}`}
                    className="text-xs text-legend-gold hover:text-gold-light transition-colors">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-warm-cream/10 text-xs text-warm-cream/60">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && <a href={buildHref(page-1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">← Prev</a>}
              {page < totalPages && <a href={buildHref(page+1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">Next →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
