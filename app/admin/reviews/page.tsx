import { requireAdmin } from "@/lib/auth/require-admin";
import { listReviews } from "@/lib/admin/reviews";
import { getUiStrings } from "@/lib/i18n/ui";
import { approveReview, rejectReview, markSpam, saveOperatorResponse } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["all","pending","approved","rejected","spam","flagged"];
const STAR_COLORS = ["","text-red-400","text-orange-400","text-amber-300","text-yellow-300","text-emerald-400"];

type PageProps = { searchParams?: { status?: string; page?: string } };

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const status = searchParams?.status ?? "pending";
  const page   = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const [{ rows, totalMatching, pageSize }, s] = await Promise.all([
    listReviews({ status: status === "all" ? undefined : status, page }),
    getUiStrings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const buildHref  = (p: number, st?: string) => {
    const qs = new URLSearchParams();
    const st2 = st ?? status;
    if (st2 !== "all") qs.set("status", st2);
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/reviews?${qs}` : "/admin/reviews";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Reviews</h1>
          <p className="text-sm text-warm-cream/60">{totalMatching} {status !== "all" ? status : "total"}</p>
        </div>
      </header>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((st) => (
          <Link key={st} href={buildHref(1, st)}
            className={`px-3 py-1.5 rounded-full border text-xs capitalize transition-colors ${
              status === st
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}>
            {st}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
            No {status !== "all" ? status : ""} reviews.
          </div>
        ) : rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${STAR_COLORS[row.rating]}`}>{"★".repeat(row.rating)}{"☆".repeat(5 - row.rating)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    row.status === "approved" ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30" :
                    row.status === "pending"  ? "bg-amber-400/15 text-amber-200 border-amber-400/30" :
                    "bg-warm-cream/10 text-warm-cream/50 border-warm-cream/20"
                  }`}>{row.status}</span>
                </div>
                {row.title && <p className="font-semibold text-warm-cream/90">{row.title}</p>}
                <p className="text-sm text-warm-cream/70 leading-relaxed max-w-2xl">{row.comment}</p>
              </div>
              <div className="text-xs text-warm-cream/40 text-right space-y-0.5">
                <div>{row.reviewer_name}{row.reviewer_country ? ` · ${row.reviewer_country}` : ""}</div>
                <div>{new Date(row.created_at).toLocaleDateString("nl-NL")}</div>
                {row.tour_name && <div className="text-warm-cream/30">{row.tour_name}</div>}
              </div>
            </div>

            {/* Operator response */}
            {row.operator_response && (
              <div className="rounded-xl border border-legend-gold/20 bg-legend-gold/5 px-4 py-3 text-sm">
                <p className="text-xs text-legend-gold font-medium mb-1">Operator response</p>
                <p className="text-warm-cream/75">{row.operator_response}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {row.status !== "approved" && (
                <form action={approveReview}>
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit"
                    className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500">
                    ✓ Approve
                  </button>
                </form>
              )}
              {row.status !== "rejected" && (
                <form action={rejectReview} className="flex gap-1 items-center">
                  <input type="hidden" name="id" value={row.id} />
                  <input name="reason" type="text" placeholder="Rejection reason (optional)"
                    className="px-2 py-1 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs w-44" />
                  <button type="submit"
                    className="px-4 py-1.5 rounded-full border border-red-400/30 text-red-400/80 text-xs hover:bg-red-400/10">
                    Reject
                  </button>
                </form>
              )}
              {row.status !== "spam" && (
                <form action={markSpam}>
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit"
                    className="px-4 py-1.5 rounded-full border border-warm-cream/15 text-warm-cream/40 text-xs hover:bg-warm-cream/5">
                    Mark spam
                  </button>
                </form>
              )}
            </div>

            {/* Respond */}
            <details className="group">
              <summary className="text-xs text-legend-gold cursor-pointer hover:text-gold-light list-none">
                {row.operator_response ? "Edit response ▼" : "+ Add operator response"}
              </summary>
              <form action={saveOperatorResponse} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={row.id} />
                <textarea name="response" rows={3} defaultValue={row.operator_response ?? ""}
                  placeholder="Respond publicly to this review…"
                  className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm resize-none focus:outline-none focus:ring-2 focus:ring-legend-gold/40" />
                <button type="submit"
                  className="px-4 py-1.5 rounded-full bg-legend-gold/20 text-legend-gold text-xs hover:bg-legend-gold/30 border border-legend-gold/30">
                  Save response
                </button>
              </form>
            </details>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-warm-cream/60">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildHref(page-1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">← Prev</Link>}
            {page < totalPages && <Link href={buildHref(page+1)} className="px-3 py-1.5 rounded-lg border border-warm-cream/15 hover:bg-warm-cream/5">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
