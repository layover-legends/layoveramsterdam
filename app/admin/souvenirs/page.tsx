import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type SouvenirRow = {
  id: string;
  booking_id: string;
  photo_refs: string[];
  ai_text: string | null;
  pdf_url: string | null;
  created_at: string;
  // Supabase join shapes vary; use unknown and narrow at render time
  bookings: unknown;
};

async function listSouvenirs(page: number) {
  const supabase = createClient();
  const pageSize = 40;
  const offset = (page - 1) * pageSize;

  const { data, count, error } = await supabase
    .from("souvenirs")
    .select("id, booking_id, photo_refs, ai_text, pdf_url, created_at, bookings(tours(name))", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { rows: (data ?? []) as unknown as SouvenirRow[], total: count ?? 0, pageSize };
}

type PageProps = { searchParams?: { page?: string } };

export default async function AdminSouvenirsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const [{ rows, total, pageSize }, s] = await Promise.all([
    listSouvenirs(page),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const buildHref = (p: number) => p > 1 ? `/admin/souvenirs?page=${p}` : "/admin/souvenirs";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {t(s, "admin.souvenirs.title", "Souvenirs")}
        </h1>
        <p className="text-sm text-warm-cream/60">
          {total} total — rows auto-created when a booking completes (Phase 10 fills AI text + PDF)
        </p>
      </header>

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.souvenirs.col_booking", "Booking")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.souvenirs.col_photos", "Photos")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.souvenirs.col_has_ai", "AI text")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.souvenirs.col_pdf", "PDF")}</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-warm-cream/55">
                    {t(s, "admin.souvenirs.empty_default", "No souvenirs yet.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3">
                      <div className="text-warm-cream/80 text-xs">
                        {(row.bookings as { tours?: { name: string } | null } | null)?.tours?.name ?? "—"}
                      </div>
                      <div className="text-warm-cream/30 font-mono text-[10px]">{row.booking_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-warm-cream/60">{row.photo_refs.length}</td>
                    <td className="px-4 py-3">
                      {row.ai_text
                        ? <span className="text-emerald-300 text-xs">✓ ready</span>
                        : <span className="text-warm-cream/30 text-xs">— Phase 10</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.pdf_url
                        ? <a href={row.pdf_url} target="_blank" rel="noopener" className="text-xs text-canal-light hover:underline">View PDF</a>
                        : <span className="text-warm-cream/30 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-warm-cream/50 text-xs">
                      {new Date(row.created_at).toLocaleDateString("en-NL")}
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
              {page > 1 && <a href={buildHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">← Prev</a>}
              {page < totalPages && <a href={buildHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">Next →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
