#!/usr/bin/env tsx
/**
 * scripts/bulk-translate.ts
 *
 * Fills the `translations` table for every (entity × field × target_locale)
 * combination by calling DeepL with the project glossary.
 *
 * Idempotent and safe to re-run:
 *   - Never overwrites rows where translated_by='human'.
 *   - Skips rows where translated_by='ai' AND is_stale=false (already done).
 *   - With --redo-stale, re-translates AI rows whose source has changed.
 *   - Writes source_hash on every row so future source edits can be detected.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY    (NOT the anon key — bypasses RLS for upserts)
 *   DEEPL_API_KEY
 *   DEEPL_API_TIER               optional, "pro" (default) or "free"
 *
 * Usage:
 *   tsx scripts/bulk-translate.ts                     full run, all langs
 *   tsx scripts/bulk-translate.ts --dry-run           plan only, no API calls
 *   tsx scripts/bulk-translate.ts --lang nl,de        subset of target locales
 *   tsx scripts/bulk-translate.ts --entity destination one entity type
 *   tsx scripts/bulk-translate.ts --redo-stale        re-translate stale AI rows
 *   tsx scripts/bulk-translate.ts --max-chars 50000   safety cap on usage
 *
 * Cost guide (DeepL Pro Developer at €20/M chars):
 *   ~4,400 strings × ~150 chars avg = ~660K chars = ~€13.20 worst case.
 *   Subsequent re-runs are nearly free since most rows are already filled.
 */

// Auto-load .env.local so the script "just works" without a CLI flag.
// loadEnvFile is Node 20.12+ / 21+ native — no external dotenv dep needed.
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
for (const envPath of [".env.local", ".env"]) {
  const abs = resolve(process.cwd(), envPath);
  if (existsSync(abs)) {
    try { loadEnvFile(abs); } catch { /* node <20.12 fallback: do nothing */ }
    break;
  }
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { deepl, sourceHash } from "../lib/i18n/providers/deepl";
import { loadGlossary } from "../lib/i18n/glossary";
import type { GlossaryEntry } from "../lib/i18n/providers/types";
import { LOCALES, type Locale } from "../lib/i18n/locales";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

interface Args {
  dryRun: boolean;
  redoStale: boolean;
  langs: Locale[];
  entities: EntityType[];
  maxChars: number;
}

type EntityType = "destination" | "tour" | "article";
const DEFAULT_ENTITIES: EntityType[] = ["destination", "tour", "article"];
const FIELDS_BY_ENTITY: Record<EntityType, string[]> = {
  // destinations.tagline does not exist; meta_title/meta_description live on
  // the destinations row but we leave them out of bulk-translate by default
  // (SEO meta is short and benefits from human curation; can add later).
  destination: ["name", "description", "area"],
  tour: ["name", "description", "tagline"],
  article: ["title", "excerpt", "body_md", "meta_title", "meta_description"],
};
const SOURCE_TABLE: Record<EntityType, string> = {
  destination: "destinations",
  tour: "tours",
  article: "articles",
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    redoStale: false,
    langs: LOCALES.map((l) => l.code).filter((c) => c !== "en") as Locale[],
    entities: DEFAULT_ENTITIES,
    maxChars: Number.POSITIVE_INFINITY,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--redo-stale") args.redoStale = true;
    else if (a === "--lang") {
      const v = argv[++i];
      args.langs = v.split(",").map((s) => s.trim()) as Locale[];
    } else if (a === "--entity") {
      const v = argv[++i];
      args.entities = v.split(",").map((s) => s.trim()) as EntityType[];
    } else if (a === "--max-chars") {
      args.maxChars = parseInt(argv[++i], 10);
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: tsx scripts/bulk-translate.ts [--dry-run] [--redo-stale] [--lang nl,de] [--entity destination] [--max-chars N]",
      );
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Supabase service-role client (bypasses RLS)
// ---------------------------------------------------------------------------

function makeServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceRow {
  id: string;
  values: Record<string, string | null>;
}

interface ExistingTranslation {
  entity_id: string;
  field: string;
  language: string;
  source_hash: string | null;
  translated_by: string;
  is_stale: boolean;
}

interface PlanItem {
  entity_type: EntityType;
  entity_id: string;
  field: string;
  target_lang: Locale;
  source_text: string;
  reason: "missing" | "stale";
}

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

async function loadSources(
  supabase: ReturnType<typeof makeServiceClient>,
  entity: EntityType,
): Promise<SourceRow[]> {
  const fields = FIELDS_BY_ENTITY[entity];
  const { data, error } = await supabase
    .from(SOURCE_TABLE[entity])
    .select(["id", ...fields].join(","));
  if (error) throw new Error(`load ${entity}: ${error.message}`);
  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    const values: Record<string, string | null> = {};
    for (const f of fields) {
      const v = r[f];
      values[f] = typeof v === "string" && v.trim() !== "" ? v : null;
    }
    return { id: r.id as string, values };
  });
}

async function loadExistingTranslations(
  supabase: ReturnType<typeof makeServiceClient>,
  entity: EntityType,
  langs: Locale[],
): Promise<Map<string, ExistingTranslation>> {
  const { data, error } = await supabase
    .from("translations")
    .select("entity_id, field, language, source_hash, translated_by, is_stale")
    .eq("entity_type", entity)
    .in("language", langs);
  if (error) throw new Error(`load translations: ${error.message}`);
  const map = new Map<string, ExistingTranslation>();
  for (const r of (data ?? []) as ExistingTranslation[]) {
    map.set(`${r.entity_id}:${r.field}:${r.language}`, r);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function buildPlan(
  entity: EntityType,
  sources: SourceRow[],
  existing: Map<string, ExistingTranslation>,
  langs: Locale[],
  redoStale: boolean,
): PlanItem[] {
  const plan: PlanItem[] = [];
  const fields = FIELDS_BY_ENTITY[entity];
  for (const row of sources) {
    for (const field of fields) {
      const text = row.values[field];
      if (!text) continue;
      const hashNow = sourceHash(text);
      for (const lang of langs) {
        const key = `${row.id}:${field}:${lang}`;
        const have = existing.get(key);
        if (!have) {
          plan.push({
            entity_type: entity,
            entity_id: row.id,
            field,
            target_lang: lang,
            source_text: text,
            reason: "missing",
          });
          continue;
        }
        if (have.translated_by === "human") continue;
        // AI row — re-translate only if stale OR if --redo-stale + hash changed
        const isStale =
          have.is_stale === true ||
          (have.source_hash !== null && have.source_hash !== hashNow);
        if (isStale && (redoStale || have.is_stale)) {
          plan.push({
            entity_type: entity,
            entity_id: row.id,
            field,
            target_lang: lang,
            source_text: text,
            reason: "stale",
          });
        }
      }
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50; // DeepL accepts up to 50 strings per request

interface BatchOutcome {
  written: number;
  charsBilled: number;
}

async function executeForLocale(
  supabase: ReturnType<typeof makeServiceClient>,
  items: PlanItem[],
  glossary: GlossaryEntry[],
  target: Locale,
  remainingChars: { value: number },
): Promise<BatchOutcome> {
  const outcome: BatchOutcome = { written: 0, charsBilled: 0 };
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const sourceTexts = batch.map((it) => it.source_text);
    const previewBilled = sourceTexts.reduce((n, s) => n + s.length, 0);
    if (previewBilled > remainingChars.value) {
      console.warn(
        `  ⚠️  reached --max-chars cap, stopping at ${target}; ${items.length - i} items skipped`,
      );
      break;
    }

    let result;
    try {
      result = await deepl.translateBatch(sourceTexts, "en", target, {
        glossary,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ DeepL error (${target}): ${msg}`);
      // Don't continue past an error — quota or auth issue, surface it.
      throw e;
    }

    remainingChars.value -= result.charsBilled;
    outcome.charsBilled += result.charsBilled;

    const upserts = batch.map((it, j) => ({
      entity_type: it.entity_type,
      entity_id: it.entity_id,
      field: it.field,
      language: it.target_lang,
      value: result.translations[j],
      translated_by: "ai",
      source_locale: "en",
      source_hash: sourceHash(it.source_text),
      is_stale: false,
      reviewed_by: null,
      reviewed_at: null,
    }));
    const { error } = await supabase
      .from("translations")
      .upsert(upserts, {
        onConflict: "entity_type,entity_id,field,language",
      });
    if (error) throw new Error(`upsert ${target}: ${error.message}`);
    outcome.written += upserts.length;
    process.stdout.write(`  ${target}: ${outcome.written}/${items.length}\r`);
  }
  process.stdout.write(`  ${target}: ${outcome.written}/${items.length} done\n`);
  return outcome;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = makeServiceClient();

  console.log("📋 plan");
  console.log(`  entities: ${args.entities.join(", ")}`);
  console.log(`  langs:    ${args.langs.join(", ")}`);
  console.log(`  redo stale: ${args.redoStale ? "yes" : "no"}`);
  console.log(`  dry-run:    ${args.dryRun ? "yes" : "no"}`);
  if (args.maxChars !== Number.POSITIVE_INFINITY) {
    console.log(`  cap: ${args.maxChars} chars`);
  }
  console.log();

  // Build plan across all entities up front so the summary is accurate.
  const allItems: PlanItem[] = [];
  for (const entity of args.entities) {
    const sources = await loadSources(supabase, entity);
    const existing = await loadExistingTranslations(
      supabase,
      entity,
      args.langs,
    );
    const items = buildPlan(
      entity,
      sources,
      existing,
      args.langs,
      args.redoStale,
    );
    allItems.push(...items);
    const totalCells = sources.length * FIELDS_BY_ENTITY[entity].length * args.langs.length;
    const skipped = totalCells - items.length;
    console.log(
      `  ${entity.padEnd(12)}: ${items.length.toString().padStart(5)} to translate, ${skipped.toString().padStart(5)} skipped`,
    );
  }
  console.log();

  if (allItems.length === 0) {
    console.log("✅ nothing to do — all translations are present and fresh");
    return;
  }

  const totalChars = allItems.reduce((n, it) => n + it.source_text.length, 0);
  const estCostEur = ((totalChars / 1_000_000) * 20).toFixed(2);
  console.log(
    `📐 ${allItems.length} translations · ~${totalChars.toLocaleString()} source chars · est. €${estCostEur} on Pro tier`,
  );
  console.log();

  if (args.dryRun) {
    console.log("🟡 dry-run — exiting without calling DeepL");
    // Sample 5 plan items for inspection
    for (const it of allItems.slice(0, 5)) {
      console.log(
        `   - ${it.entity_type} ${it.entity_id} ${it.field} → ${it.target_lang} (${it.reason}): "${it.source_text.slice(0, 60)}…"`,
      );
    }
    return;
  }

  // Group by target locale so we load each glossary once.
  const byLocale = new Map<Locale, PlanItem[]>();
  for (const it of allItems) {
    const arr = byLocale.get(it.target_lang) ?? [];
    arr.push(it);
    byLocale.set(it.target_lang, arr);
  }

  const startMs = Date.now();
  const remainingChars = { value: args.maxChars };
  let totalWritten = 0;
  let totalBilled = 0;
  const perLocale: Record<string, "done" | "skipped" | "error"> = {};
  const errors: string[] = [];

  for (const [target, items] of byLocale) {
    console.log(`🌍 ${target} — ${items.length} items`);
    const glossary = await loadGlossary(target, supabase as never);
    if (glossary.length > 0) {
      console.log(`  glossary: ${glossary.length} entries loaded`);
    }
    try {
      const outcome = await executeForLocale(
        supabase,
        items,
        glossary,
        target,
        remainingChars,
      );
      totalWritten += outcome.written;
      totalBilled += outcome.charsBilled;
      perLocale[target] = "done";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${target}: ${msg}`);
      perLocale[target] = "error";
    }
  }

  const duration_ms = Date.now() - startMs;

  // Write a single translation_jobs row summarising the full bulk run.
  if (!args.dryRun) {
    try {
      await supabase.from("translation_jobs").insert({
        entity_type:    "destination",   // bulk covers all entity types; use sentinel
        entity_id:      "00000000-0000-0000-0000-000000000000",
        triggered_by:   null,
        trigger_source: "cli_bulk",
        written:        totalWritten,
        skipped:        0,
        errors,
        per_locale:     perLocale,
        duration_ms,
        deepl_chars:    totalBilled,
      });
    } catch (e) {
      console.warn("⚠️  Could not write translation_jobs row:", e instanceof Error ? e.message : e);
    }
  }

  console.log();
  console.log("✅ done");
  console.log(`  rows written:   ${totalWritten}`);
  console.log(`  chars billed:   ${totalBilled.toLocaleString()}`);
  console.log(
    `  est. cost:      €${((totalBilled / 1_000_000) * 20).toFixed(2)} (Pro tier)`,
  );
  if (errors.length > 0) console.error("  errors:", errors);
}

main().catch((e) => {
  console.error("❌ fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
