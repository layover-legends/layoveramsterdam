import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getFaqById } from "@/lib/admin/faq";
import { saveFaqEntry, hardDeleteFaq } from "@/app/admin/faq/actions";
import { FAQ_CATEGORIES } from "@/lib/admin/faq-types";
import { getUiStrings, t } from "@/lib/i18n/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";
type PageProps = { params: { id: string }; searchParams?: { saved?: string } };

export default async function EditFaqPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const [row, s] = await Promise.all([getFaqById(params.id), getUiStrings()]);
  if (!row) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <Link href="/admin/faq" className="text-xs text-warm-cream/50 hover:text-warm-cream/80">← FAQ</Link>
        <h1 className="font-display text-2xl font-semibold truncate max-w-xl">{row.question}</h1>
      </header>

      {searchParams?.saved === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.common.saved", "Saved.")}
        </div>
      )}

      <form action={saveFaqEntry} className="space-y-5">
        <input type="hidden" name="id" value={row.id} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="category" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Category</label>
            <select id="category" name="category" defaultValue={row.category}
              className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm"
              style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
              {FAQ_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} style={{ backgroundColor: "#0D0D0D" }}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sort_order" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Sort order</label>
            <input id="sort_order" name="sort_order" type="number" defaultValue={row.sort_order}
              className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="question" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Question *</label>
          <input id="question" name="question" type="text" required defaultValue={row.question}
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="answer" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Answer *</label>
          <textarea id="answer" name="answer" rows={8} required defaultValue={row.answer}
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40 resize-y" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Visibility</label>
          <select name="is_active" defaultValue={String(row.is_active)}
            className="px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm"
            style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
            <option value="true"  style={{ backgroundColor: "#0D0D0D" }}>Active — shown on /faq</option>
            <option value="false" style={{ backgroundColor: "#0D0D0D" }}>Inactive — hidden from public</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light">
            {t(s, "common.save_changes", "Save")}
          </button>
          <Link href="/admin/faq" className="px-6 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5">
            {t(s, "common.cancel", "Cancel")}
          </Link>
        </div>
      </form>

      <div className="pt-8 border-t border-warm-cream/10">
        <h3 className="text-sm font-semibold text-warm-cream/60 mb-3">Danger zone</h3>
        <form action={hardDeleteFaq}>
          <input type="hidden" name="id" value={row.id} />
          <button type="submit"
            className="px-5 py-2 rounded-full border border-red-400/30 text-red-400/80 text-sm hover:bg-red-400/10">
            Delete entry
          </button>
        </form>
      </div>
    </div>
  );
}
