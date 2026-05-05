import { requireAdmin } from "@/lib/auth/require-admin";
import { saveFaqEntry } from "@/app/admin/faq/actions";
import { FAQ_CATEGORIES } from "@/lib/admin/faq-types";
import { getUiStrings, t } from "@/lib/i18n/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewFaqPage() {
  await requireAdmin();
  const s = await getUiStrings();

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <Link href="/admin/faq" className="text-xs text-warm-cream/50 hover:text-warm-cream/80">← FAQ</Link>
        <h1 className="font-display text-2xl font-semibold">New FAQ entry</h1>
      </header>
      <form action={saveFaqEntry} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="category" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Category *</label>
          <select id="category" name="category" required
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
            style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
            {FAQ_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} style={{ backgroundColor: "#0D0D0D" }}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sort_order" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Sort order</label>
          <input id="sort_order" name="sort_order" type="number" defaultValue={100}
            className="w-32 px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="question" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Question *</label>
          <input id="question" name="question" type="text" required
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="answer" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">Answer *</label>
          <textarea id="answer" name="answer" rows={6} required
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40 resize-y" />
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
    </div>
  );
}
