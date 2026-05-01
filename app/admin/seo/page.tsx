import Link from "next/link";
import { getSeoHealth } from "@/lib/admin/seo";
import type { SeoIssue } from "@/lib/admin/seo-types";

export const dynamic = "force-dynamic";

function pct(num: number, denom: number): string {
  if (denom === 0) return "–";
  return Math.round((num / denom) * 100) + "%";
}

function HealthBadge({ healthy, total }: { healthy: number; total: number }) {
  const ratio = total === 0 ? 1 : healthy / total;
  const color =
    ratio >= 0.9
      ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
      : ratio >= 0.6
      ? "bg-amber-400/15 text-amber-200 border-amber-400/30"
      : "bg-red-400/15 text-red-200 border-red-400/30";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${color}`}>
      {healthy}/{total} healthy · {pct(healthy, total)}
    </span>
  );
}

function IssuePill({ issue }: { issue: SeoIssue }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-amber-400/15 text-amber-200 border border-amber-400/25">
      {issue.label}
    </span>
  );
}

export default async function AdminSeoPage() {
  const health = await getSeoHealth();
  const dest = health.destinations;
  const tours = health.tours;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-brand-cream/55">SEO health</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SEO Dashboard</h1>
        <p className="text-sm text-brand-cream/60 max-w-2xl">
          Read-only audit of every destination and tour. Issues are computed from{" "}
          <code className="text-brand-orange">description</code> length,{" "}
          <code className="text-brand-orange">primary photo</code>,{" "}
          <code className="text-brand-orange">alt text</code>,{" "}
          <code className="text-brand-orange">coordinates</code>, and slug uniqueness. Click any
          row to fix it.
        </p>
      </header>

      {/* Headline cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-cream/55">Destinations</p>
              <p className="text-3xl font-bold tracking-tight mt-1">{dest.total}</p>
            </div>
            <HealthBadge healthy={dest.healthy} total={dest.total} />
          </div>
          <ul className="text-sm text-brand-cream/75 space-y-1">
            <li>{dest.counts.missing_description} missing description</li>
            <li>{dest.counts.description_too_short} description &lt; 50 chars</li>
            <li>{dest.counts.description_too_long} description &gt; 160 chars</li>
            <li>{dest.counts.missing_primary_photo} missing primary photo</li>
            <li>{dest.counts.missing_alt_text} photos without alt text</li>
            <li>{dest.counts.missing_coords} missing coordinates</li>
            {dest.counts.duplicate_slug > 0 && (
              <li className="text-red-200">{dest.counts.duplicate_slug} duplicate slugs ⚠️</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-cream/55">Tours</p>
              <p className="text-3xl font-bold tracking-tight mt-1">{tours.total}</p>
            </div>
            <HealthBadge healthy={tours.healthy} total={tours.total} />
          </div>
          <ul className="text-sm text-brand-cream/75 space-y-1">
            <li>{tours.counts.missing_tagline} missing tagline</li>
            <li>{tours.counts.missing_description} missing description</li>
            <li>{tours.counts.description_too_short} description &lt; 50 chars</li>
            <li>{tours.counts.description_too_long} description &gt; 160 chars</li>
          </ul>
        </div>
      </section>

      {/* Destinations punch list */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
            Destinations needing work ({dest.needsWork})
          </h2>
        </div>

        {dest.items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-sm text-emerald-100">
            All destinations are healthy. Nothing to fix.
          </div>
        ) : (
          <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-brand-cream/[0.04] text-xs uppercase tracking-wide text-brand-cream/55">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Stop</th>
                    <th className="px-4 py-3 text-left font-medium">Issues</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-cream/10">
                  {dest.items.slice(0, 100).map((d) => (
                    <tr key={d.id} className="hover:bg-brand-cream/[0.03]">
                      <td className="px-4 py-3 max-w-[20rem]">
                        <Link
                          href={`/admin/stops/${d.id}`}
                          className="text-brand-cream font-medium hover:text-brand-orange transition-colors"
                        >
                          {d.name}
                        </Link>
                        <div className="text-xs text-brand-cream/45 truncate">{d.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {d.issues.map((i) => (
                            <IssuePill key={i.kind} issue={i} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          {d.is_active ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-cream/10 text-brand-cream/60">
                              Hidden
                            </span>
                          )}
                          {d.is_adult_only && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-red-400/20 text-red-200">
                              18+
                            </span>
                          )}
                          {d.requires_booking && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-orange/20 text-brand-orange">
                              €
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dest.items.length > 100 && (
              <div className="px-4 py-3 border-t border-brand-cream/10 text-xs text-brand-cream/55">
                Showing first 100 of {dest.items.length}. Fix some, refresh to see the next batch.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tours punch list */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
          Tours needing work ({tours.needsWork})
        </h2>

        {tours.items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-sm text-emerald-100">
            All tours are healthy. Nothing to fix.
          </div>
        ) : (
          <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-brand-cream/[0.04] text-xs uppercase tracking-wide text-brand-cream/55">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tour</th>
                  <th className="px-4 py-3 text-left font-medium">Issues</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-cream/10">
                {tours.items.map((t) => (
                  <tr key={t.id} className="hover:bg-brand-cream/[0.03]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tours/${t.id}`}
                        className="text-brand-cream font-medium hover:text-brand-orange transition-colors"
                      >
                        {t.name}
                      </Link>
                      <div className="text-xs text-brand-cream/45">{t.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.issues.map((i) => (
                          <IssuePill key={i.kind} issue={i} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-cream/10 text-brand-cream/60">
                          Draft
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="text-xs text-brand-cream/45 pt-4 border-t border-brand-cream/10">
        Phase 2 will add per-stop meta_title/meta_description override fields and a content
        editor for SEO articles. This dashboard surfaces what to fix; the next slices give you
        the controls.
      </footer>
    </div>
  );
}
