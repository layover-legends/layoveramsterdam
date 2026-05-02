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
import { getUiStrings, t, tpl } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

function RetranslateButton({
  kind, id, label, title,
}: {
  kind: "destination" | "tour";
  id: string;
  label: string;
  title: string;
}) {
  return (
    <form action={retranslateEntity} className="inline">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={title}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] uppercase tracking-wider bg-legend-gold/15 text-legend-gold border border-legend-gold/30 hover:bg-legend-gold/25 transition-colors"
      >
        {label}
      </button>
    </form>
  );
}

const LOCALE_LABEL: Record<TranslationLocale, string> = {
  fr: "Français", nl: "Nederlands", de: "Deutsch",
  es: "Español",  it: "Italiano",  pt: "Português", zh: "中文",
};

function coverageColor(ratio: number): string {
  if (ratio >= 0.95) return "bg-emerald-400/15 text-emerald-200 border-emerald-400/30";
  if (ratio >= 0.6)  return "bg-amber-400/15 text-amber-200 border-amber-400/30";
  return "bg-red-400/15 text-red-200 border-red-400/30";
}

function CoverageCell({ cov }: { cov: LocaleEntityCoverage }) {
  if (cov.expected === 0) return <span className="text-warm-cream/35 text-xs">–</span>;
  const pctVal = Math.round(cov.ratio * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-block px-2 py-0.5 rounded text-xs border w-fit ${coverageColor(cov.ratio)}`}>
        {pctVal}%
      </span>
      <span className="text-[10px] text-warm-cream/45">{cov.covered}/{cov.expected}</span>
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
    ratio >= 0.9 ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30" :
    ratio >= 0.6 ? "bg-amber-400/15 text-amber-200 border-amber-400/30" :
                   "bg-red-400/15 text-red-200 border-red-400/30";
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
  const [health, translation, recentJobs, s] = await Promise.all([
    getSeoHealth(),
    getTranslationCoverage(),
    getRecentTranslationJobs(20),
    getUiStrings(),
  ]);

  const dest  = health.destinations;
  const tours = health.tours;
  const retranslated = searchParams?.retranslated;
  const status       = searchParams?.status;
  const detail       = searchParams?.detail;

  const entityLabels: Record<EntityKind, string> = {
    destination: t(s, "admin.seo.entity_dests",    "Destinations"),
    tour:        t(s, "admin.seo.entity_tours",    "Tours"),
    article:     t(s, "admin.seo.entity_articles", "Articles"),
  };

  const retranslateLabel = t(s, "admin.seo.retranslate_button", "🤖 Translate");
  const retranslateTitle = t(s, "admin.seo.retranslate_title",  "Re-run DeepL for any locales missing this entity (skips human-edited rows)");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-warm-cream/55">
          {t(s, "admin.seo.eyebrow", "SEO health")}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {t(s, "admin.seo.title", "SEO Dashboard")}
        </h1>
        <p className="text-sm text-warm-cream/60 max-w-2xl">
          {t(s, "admin.seo.subtitle", "Read-only audit of every destination and tour.")}
          {" "}Click any row to fix it. Click{" "}
          <span className="px-1 py-0.5 rounded bg-legend-gold/15 text-legend-gold text-[10px]">
            🤖 {t(s, "admin.seo.retranslate_button", "TRANSLATE")}
          </span>{" "}
          to re-run DeepL for any row missing translations.
        </p>
      </header>

      {/* Retranslate status banner */}
      {retranslated && status && (
        <div
          role="alert"
          className={
            "rounded-xl border px-4 py-3 text-sm " +
            (status === "ok"      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" :
             status === "noop"    ? "border-warm-cream/20 bg-warm-cream/5 text-warm-cream/70" :
             status === "partial" ? "border-amber-400/40 bg-amber-400/10 text-amber-100" :
                                    "border-red-400/40 bg-red-400/10 text-red-100")
          }
        >
          {status === "ok"      && tpl(t(s, "admin.seo.status_ok",      "✅ Re-translated {name} across all missing locales."), { name: retranslated })}
          {status === "noop"    && tpl(t(s, "admin.seo.status_noop",     "ℹ️ Nothing to do for {name} — every locale already has a current translation."), { name: retranslated })}
          {status === "partial" && <>{tpl(t(s, "admin.seo.status_partial", "⚠️ Partial translation for {name}"), { name: retranslated })}{detail ? `: ${detail}` : "."}</>}
          {status === "failed"  && <>{tpl(t(s, "admin.seo.status_failed",  "❌ Failed to translate {name}"),   { name: retranslated })}{detail ? `: ${detail}` : "."}</>}
        </div>
      )}

      {/* Headline cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-warm-cream/55">
                {t(s, "admin.seo.entity_dests", "Destinations")}
              </p>
              <p className="font-display text-3xl font-semibold tracking-tight mt-1">{dest.total}</p>
            </div>
            <HealthBadge healthy={dest.healthy} total={dest.total} />
          </div>
          <ul className="text-sm text-warm-cream/75 space-y-1">
            <li>{dest.counts.missing_description} {t(s, "admin.seo.card.missing_description", "missing description")}</li>
            <li>{dest.counts.description_too_short} {t(s, "admin.seo.card.desc_too_short", "description < 50 chars")}</li>
            <li>{dest.counts.description_too_long} {t(s, "admin.seo.card.desc_too_long", "description > 160 chars")}</li>
            <li>{dest.counts.missing_primary_photo} {t(s, "admin.seo.card.missing_primary_photo", "missing primary photo")}</li>
            <li>{dest.counts.missing_alt_text} {t(s, "admin.seo.card.missing_alt", "photos without alt text")}</li>
            <li>{dest.counts.missing_coords} {t(s, "admin.seo.card.missing_coords", "missing coordinates")}</li>
            {dest.counts.duplicate_slug > 0 && (
              <li className="text-red-200">{dest.counts.duplicate_slug} {t(s, "admin.seo.card.duplicate_slugs", "duplicate slugs")} ⚠️</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-warm-cream/55">
                {t(s, "admin.seo.entity_tours", "Tours")}
              </p>
              <p className="font-display text-3xl font-semibold tracking-tight mt-1">{tours.total}</p>
            </div>
            <HealthBadge healthy={tours.healthy} total={tours.total} />
          </div>
          <ul className="text-sm text-warm-cream/75 space-y-1">
            <li>{tours.counts.missing_tagline} {t(s, "admin.seo.card.missing_tagline", "missing tagline")}</li>
            <li>{tours.counts.missing_description} {t(s, "admin.seo.card.missing_description", "missing description")}</li>
            <li>{tours.counts.description_too_short} {t(s, "admin.seo.card.desc_too_short", "description < 50 chars")}</li>
            <li>{tours.counts.description_too_long} {t(s, "admin.seo.card.desc_too_long", "description > 160 chars")}</li>
          </ul>
        </div>
      </section>

      {/* Translation coverage matrix */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-sm uppercase tracking-wide text-warm-cream/55">
            {t(s, "admin.seo.translation_section", "Translation coverage")}
          </h2>
          <div className="flex flex-wrap gap-3 text-xs text-warm-cream/65">
            <span>{tpl(t(s, "admin.seo.coverage_human",   "👤 {count} human"),   { count: translation.bySource.human.toLocaleString() })}</span>
            <span>{tpl(t(s, "admin.seo.coverage_ai",      "🤖 {count} AI"),      { count: translation.bySource.ai.toLocaleString() })}</span>
            {translation.bySource.imported > 0 && (
              <span>{tpl(t(s, "admin.seo.coverage_imported", "📥 {count} imported"), { count: translation.bySource.imported.toLocaleString() })}</span>
            )}
            {translation.stale > 0 && (
              <span className="text-amber-200">
                {tpl(t(s, "admin.seo.coverage_stale", "⚠️ {count} stale"), { count: translation.stale.toLocaleString() })}
              </span>
            )}
            <span className="text-warm-cream/45">·</span>
            <span>{translation.total.toLocaleString()} {t(s, "admin.seo.coverage_total", "total rows").replace("· ", "")}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_locale", "Locale")}</th>
                  {(["destination", "tour", "article"] as const).map((kind) => (
                    <th key={kind} className="px-4 py-3 text-left font-medium">
                      {entityLabels[kind]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-cream/10">
                {TRANSLATION_LOCALES.map((locale) => {
                  const row = translation.byLocale[locale];
                  return (
                    <tr key={locale} className="hover:bg-warm-cream/[0.03]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-warm-cream">{LOCALE_LABEL[locale]}</div>
                        <div className="text-[10px] uppercase tracking-wider text-warm-cream/45">{locale}</div>
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
          <div className="px-4 py-2 border-t border-warm-cream/10 text-[11px] text-warm-cream/45">
            {t(s, "admin.seo.coverage_hint", "Cell shows % of (entity × field) pairs translated. Green ≥ 95% · amber 60–94% · red < 60%.")}
            {" "}Run <code className="text-legend-gold">npx tsx scripts/bulk-translate.ts</code> to fill missing rows.
          </div>
        </div>
      </section>

      {/* Destinations punch list */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm uppercase tracking-wide text-warm-cream/55">
            {tpl(t(s, "admin.seo.dests_needs_work", "Destinations needing work ({count})"), { count: dest.needsWork })}
          </h2>
        </div>

        {dest.items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-sm text-emerald-100">
            {t(s, "admin.seo.all_dests_healthy", "All destinations are healthy. Nothing to fix.")}
          </div>
        ) : (
          <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_stop",   "Stop")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_issues", "Issues")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_status", "Status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_action", "Action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-cream/10">
                  {dest.items.slice(0, 100).map((d) => {
                    const hasMissingTranslation = d.issues.some((i) => i.kind.startsWith("missing_translation_"));
                    return (
                      <tr key={d.id} className="hover:bg-warm-cream/[0.03]">
                        <td className="px-4 py-3 max-w-[20rem]">
                          <Link href={`/admin/stops/${d.id}`}
                            className="text-warm-cream font-medium hover:text-legend-gold transition-colors">
                            {d.name}
                          </Link>
                          <div className="text-xs text-warm-cream/45 truncate">{d.slug}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.issues.map((i) => <IssuePill key={i.kind} issue={i} />)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            {d.is_active ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                                {t(s, "admin.common.active", "Active")}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-warm-cream/10 text-warm-cream/60">
                                {t(s, "admin.common.hidden", "Hidden")}
                              </span>
                            )}
                            {d.is_adult_only && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-red-400/20 text-red-200">18+</span>}
                            {d.requires_booking && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-legend-gold/20 text-legend-gold">€</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {hasMissingTranslation && (
                            <RetranslateButton kind="destination" id={d.id} label={retranslateLabel} title={retranslateTitle} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {dest.items.length > 100 && (
              <div className="px-4 py-3 border-t border-warm-cream/10 text-xs text-warm-cream/55">
                {tpl(t(s, "admin.seo.showing_first", "Showing first {count} of {total}. Fix some, refresh to see the next batch."),
                  { count: 100, total: dest.items.length })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tours punch list */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-warm-cream/55">
          {tpl(t(s, "admin.seo.tours_needs_work", "Tours needing work ({count})"), { count: tours.needsWork })}
        </h2>

        {tours.items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-sm text-emerald-100">
            {t(s, "admin.seo.all_tours_healthy", "All tours are healthy. Nothing to fix.")}
          </div>
        ) : (
          <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_tour",   "Tour")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_issues", "Issues")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_status", "Status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t(s, "admin.seo.col_action", "Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-cream/10">
                {tours.items.map((tour) => {
                  const hasMissingTranslation = tour.issues.some((i) => i.kind.startsWith("missing_translation_"));
                  return (
                    <tr key={tour.id} className="hover:bg-warm-cream/[0.03]">
                      <td className="px-4 py-3">
                        <Link href={`/admin/tours/${tour.id}`}
                          className="text-warm-cream font-medium hover:text-legend-gold transition-colors">
                          {tour.name}
                        </Link>
                        <div className="text-xs text-warm-cream/45">{tour.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tour.issues.map((i) => <IssuePill key={i.kind} issue={i} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tour.is_active ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                            {t(s, "admin.common.active", "Active")}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-warm-cream/10 text-warm-cream/60">
                            {t(s, "admin.common.draft", "Draft")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {hasMissingTranslation && (
                          <RetranslateButton kind="tour" id={tour.id} label={retranslateLabel} title={retranslateTitle} />
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

      {/* Recent translation jobs */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-warm-cream/55">
          {t(s, "admin.seo.jobs_section", "Recent translation jobs")}
        </h2>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-warm-cream/50 py-4">
            {t(s, "admin.seo.jobs_empty", "No jobs yet. Save or create a stop or tour to trigger the first run.")}
          </p>
        ) : (
          <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-warm-cream/[0.04] text-[11px] uppercase tracking-wide text-warm-cream/55">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.col_status",         "Status")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_entity",    "Entity")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_surface",   "Surface")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_written",   "Written")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_skipped",   "Skipped")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_chars",     "Chars")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_ms",        "ms")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_when",      "When")}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t(s, "admin.seo.jobs_col_errors",    "Errors")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-cream/10">
                  {recentJobs.map((job: TranslationJob) => (
                    <tr key={job.id} className="hover:bg-warm-cream/[0.03]">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {job.status === "ok"      ? <span className="text-emerald-300">{t(s, "admin.seo.job_ok",      "✅ ok")}</span>
                         : job.status === "partial" ? <span className="text-amber-300">{t(s, "admin.seo.job_partial", "⚠️ partial")}</span>
                         : <span className="text-red-300">{t(s, "admin.seo.job_failed", "❌ failed")}</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Link
                          href={`/admin/${job.entity_type === "destination" ? "stops" : job.entity_type + "s"}/${job.entity_id}`}
                          className="text-legend-gold hover:underline"
                        >
                          {job.entity_type} ↗
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-warm-cream/60">{job.trigger_source}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-emerald-300/80">{job.written}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-warm-cream/50">{job.skipped}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-warm-cream/60">{job.deepl_chars.toLocaleString()}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-warm-cream/50">{job.duration_ms ?? "—"}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-warm-cream/50">
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
                          <span className="text-warm-cream/30">—</span>
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

      <footer className="text-xs text-warm-cream/45 pt-4 border-t border-warm-cream/10">
        {t(s, "admin.seo.jobs_footer",
          "Translation jobs are written after every admin save. If a job shows ❌ failed, check DEEPL_API_KEY in Vercel project settings and the error column.")}
      </footer>
    </div>
  );
}
