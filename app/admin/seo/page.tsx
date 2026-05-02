import Link from "next/link";
import { getSeoHealth, getTranslationCoverage, getRecentTranslationJobs } from "@/lib/admin/seo";
import type { TranslationJob } from "@/lib/admin/seo";
import type {
  EntityKind,
  LocaleEntityCoverage,
  SeoIssue,
  TranslationLocale,
} from "@/lib/admin/seo-types";
import { TRANSLATION_LOCALES } from "@/lib/admin/seo-types";
import { retranslateEntity } from "@/app/admin/seo/actions";

export const dynamic = "force-dynamic";

function RetranslateButton({ kind, id }: { kind: "destination" | "tour"; id: string }) {
  return (
    <form action={retranslateEntity} className="inline">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] uppercase tracking-wider bg-brand-orange/15 text-brand-orange border border-brand-orange/30 hover:bg-brand-orange/25 transition-colors"
        title="Re-run DeepL for any locales missing this entity (skips human-edited rows)"
      >
        🤖 Translate
      </button>
    </form>
  );
}

const LOCALE_LABEL: Record<TranslationLocale, string> = {
  fr: "Français",
  nl: "Nederlands",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  zh: "中文",
};

const ENTITY_LABEL: Record<EntityKind, string> = {
  destination: "Destinations",
  tour: "Tours",
  article: "Articles",
};

function coverageColor(ratio: number): string {
  if (ratio >= 0.95) return "bg-emerald-400/15 text-emerald-200 border-emerald-400/30";
  if (ratio >= 0.6) return "bg-amber-400/15 text-amber-200 border-amber-400/30";
  return "bg-red-400/15 text-red-200 border-red-400/30";
}

function CoverageCell({ cov }: { cov: LocaleEntityCoverage }) {
  if (cov.expected === 0) {
    return <span className="text-brand-cream/35 text-xs">–</span>;
  }
  const pctVal = Math.round(cov.ratio * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-block px-2 py-0.5 rounded text-xs border w-fit ${coverageColor(cov.ratio)}`}>
        {pctVal}%
      </span>
      <span className="text-[10px] text-brand-cream/45">
        {cov.covered}/{cov.expected}
      </span>
    </div>
  );
}

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

type PageProps = {
  searchParams?: { retranslated?: string; status?: string; detail?: string };
};

export default async function AdminSeoPage({ searchParams }: PageProps) {
  const [health, translation, recentJobs] = await Promise.all([
    getSeoHealth(),
    getTranslationCoverage(),
    getRecentTranslationJobs(20),
  ]);
  const dest = health.destinations;
  const tours = health.tours;
  const retranslated = searchParams?.retranslated;
  const status = searchParams?.status;
  const detail = searchParams?.detail;

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
          row to fix it. Click <span className="px-1 py-0.5 rounded bg-brand-orange/15 text-brand-orange text-[10px]">🤖 TRANSLATE</span> to re-run DeepL for any row missing translations.
        </p>
      </header>

      {retranslated && status && (
        <div
          role="alert"
          className={
            "rounded-xl border px-4 py-3 text-sm " +
            (status === "ok"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
              : status === "noop"
              ? "border-brand-cream/20 bg-brand-cream/5 text-brand-cream/70"
              : status === "partial"
              ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
              : "border-red-400/40 bg-red-400/10 text-red-100")
          }
        >
          {status === "ok" && <>✅ Re-translated <code className="text-brand-orange">{retranslated}</code> across all missing locales.</>}
          {status === "noop" && <>ℹ️ Nothing to do for <code>{retranslated}</code> — every locale already has a current translation.</>}
          {status === "partial" && <>⚠️ Partial translation for <code>{retranslated}</code>{detail ? `: ${detail}` : "."}</>}
          {status === "failed" && <>❌ Failed to translate <code>{retranslated}</code>{detail ? `: ${detail}` : "."}</>}
        </div>
      )}

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

      {/* Translation coverage matrix */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
            Translation coverage
          </h2>
          <div className="flex flex-wrap gap-3 text-xs text-brand-cream/65">
            <span>👤 {translation.bySource.human.toLocaleString()} human</span>
            <span>🤖 {translation.bySource.ai.toLocaleString()} AI</span>
            {translation.bySource.imported > 0 && (
              <span>📥 {translation.bySource.imported.toLocaleString()} imported</span>
            )}
            {translation.stale > 0 && (
              <span className="text-amber-200">
                ⚠️ {translation.stale.toLocaleString()} stale
              </span>
            )}
            <span className="text-brand-cream/45">·</span>
            <span>{translation.total.toLocaleString()} total rows</span>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-brand-cream/[0.04] text-xs uppercase tracking-wide text-brand-cream/55">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Locale</th>
                  {(["destination", "tour", "article"] as const).map((kind) => (
                    <th key={kind} className="px-4 py-3 text-left font-medium">
                      {ENTITY_LABEL[kind]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-cream/10">
                {TRANSLATION_LOCALES.map((locale) => {
                  const row = translation.byLocale[locale];
                  return (
                    <tr key={locale} className="hover:bg-brand-cream/[0.03]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-brand-cream">
                          {LOCALE_LABEL[locale]}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-brand-cream/45">
                          {locale}
                        </div>
                      </td>
                      {(["destination", "tour", "article"] as const).map((kind) => (
                        <td key={kind} className="px-4 py-3">
                          <CoverageCell cov={row[kind]} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-brand-cream/10 text-[11px] text-brand-cream/45">
            Cell shows percentage of (entity × field) pairs translated for that locale. Green ≥ 95% · amber 60–94% · red &lt; 60%. Run{" "}
            <code className="text-brand-orange">npx tsx scripts/bulk-translate.ts</code> to fill missing rows.
          </div>
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
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-cream/10">
                  {dest.items.slice(0, 100).map((d) => {
                    const hasMissingTranslation = d.issues.some((i) =>
                      i.kind.startsWith("missing_translation_"),
                    );
                    return (
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          {hasMissingTranslation && (
                            <RetranslateButton kind="destination" id={d.id} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-cream/10">
                {tours.items.map((t) => {
                  const hasMissingTranslation = t.issues.some((i) =>
                    i.kind.startsWith("missing_translation_"),
                  );
                  return (
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        {hasMissingTranslation && (
                          <RetranslateButton kind="tour" id={t.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Recent translation jobs ─────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
          Recent translation jobs
        </h2>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-brand-cream/50 py-4">
            No jobs yet. Save or create a stop or tour to trigger the first run.
          </p>
        ) : (
          <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-brand-cream/[0.04] text-[11px] uppercase tracking-wide text-brand-cream/55">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Entity</th>
                    <th className="px-4 py-2.5 text-left font-medium">Surface</th>
                    <th className="px-4 py-2.5 text-left font-medium">Written</th>
                    <th className="px-4 py-2.5 text-left font-medium">Skipped</th>
                    <th className="px-4 py-2.5 text-left font-medium">Chars</th>
                    <th className="px-4 py-2.5 text-left font-medium">ms</th>
                    <th className="px-4 py-2.5 text-left font-medium">When</th>
                    <th className="px-4 py-2.5 text-left font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-cream/10">
                  {recentJobs.map((job: TranslationJob) => (
                    <tr key={job.id} className="hover:bg-brand-cream/[0.03]">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {job.status === "ok" ? (
                          <span className="text-emerald-300">✅ ok</span>
                        ) : job.status === "partial" ? (
                          <span className="text-amber-300">⚠️ partial</span>
                        ) : (
                          <span className="text-red-300">❌ failed</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Link
                          href={`/admin/${job.entity_type === "destination" ? "stops" : job.entity_type + "s"}/${job.entity_id}`}
                          className="text-brand-orange hover:underline"
                        >
                          {job.entity_type} ↗
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-brand-cream/60">
                        {job.trigger_source}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-emerald-300/80">
                        {job.written}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-brand-cream/50">
                        {job.skipped}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-brand-cream/60">
                        {job.deepl_chars.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-brand-cream/50">
                        {job.duration_ms ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-brand-cream/50">
                        {new Date(job.triggered_at).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 max-w-[22rem]">
                        {job.errors.length > 0 ? (
                          <span className="text-red-300/80 truncate block" title={job.errors.join(" | ")}>
                            {job.errors[0]}{job.errors.length > 1 ? ` +${job.errors.length - 1}` : ""}
                          </span>
                        ) : (
                          <span className="text-brand-cream/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <footer className="text-xs text-brand-cream/45 pt-4 border-t border-brand-cream/10">
        Translation jobs are written after every admin save. If a job shows ❌ failed, check
        DEEPL_API_KEY in Vercel project settings and the error column for the exact cause.
      </footer>
    </div>
  );
}
