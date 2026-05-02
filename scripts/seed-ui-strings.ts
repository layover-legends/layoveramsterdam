#!/usr/bin/env tsx
/**
 * scripts/seed-ui-strings.ts
 *
 * Seeds every key in lib/i18n/ui-strings.ts into the translations table:
 *   - EN rows: inserted as translated_by='human' (the English copy is canonical)
 *   - Non-EN rows: translated via DeepL, inserted as translated_by='ai'
 *
 * Idempotent: safe to re-run.
 *   - EN rows: ON CONFLICT DO UPDATE always (the manifest is the source of truth)
 *   - Non-EN rows: skipped if translated_by='ai' AND source_hash matches (already fresh)
 *   - Non-EN rows: always updated if translated_by='human' is NOT set (never clobbers
 *     manually edited translations)
 *
 * Required env vars (loaded from .env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPL_API_KEY
 *   DEEPL_API_TIER   optional — "free" (default) or "pro"
 *
 * Usage:
 *   npx tsx scripts/seed-ui-strings.ts               full run, all 8 locales
 *   npx tsx scripts/seed-ui-strings.ts --lang fr,nl   subset of locales
 *   npx tsx scripts/seed-ui-strings.ts --dry-run      print plan, no writes
 *   npx tsx scripts/seed-ui-strings.ts --en-only      seed EN source rows only
 */

import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local / .env if present (Node 20.12+ native).
for (const p of [".env.local", ".env"]) {
  const abs = resolve(process.cwd(), p);
  if (existsSync(abs)) {
    try { loadEnvFile(abs); } catch { /* pre-20.12 — skip */ }
    break;
  }
}

import { createClient } from "@supabase/supabase-js";
import { deepl, sourceHash } from "../lib/i18n/providers/deepl";
import { loadGlossary } from "../lib/i18n/glossary";
import { LOCALES, type Locale } from "../lib/i18n/locales";
import { UI_STRINGS } from "../lib/i18n/ui-strings";

// ── Config ──────────────────────────────────────────────────────────────────

const UI_ENTITY_ID = "00000000-0000-0000-0000-000000000001";
const DEEPL_BATCH  = 50;   // max texts per DeepL request

const args = process.argv.slice(2);
const DRY_RUN  = args.includes("--dry-run");
const EN_ONLY  = args.includes("--en-only");
const langArg  = args.find(a => a.startsWith("--lang="))?.slice("--lang=".length)
              ?? args[args.indexOf("--lang") + 1];
const TARGET_LOCALES: Locale[] = langArg
  ? (langArg.split(",") as Locale[])
  : (LOCALES.map(l => l.code).filter(c => c !== "en") as Locale[]);

// ── Supabase (service role — bypasses RLS) ──────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceKey);

// ── Helpers ─────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const keys   = Object.keys(UI_STRINGS) as Array<keyof typeof UI_STRINGS>;
  const values = Object.values(UI_STRINGS) as string[];
  console.log(`\n🌐  seed-ui-strings — ${keys.length} keys`);
  console.log(`    Targets: EN${EN_ONLY ? " only" : " + " + TARGET_LOCALES.join(", ")}`);
  if (DRY_RUN) console.log("    DRY RUN — no writes");

  // ── 1) Seed EN rows ───────────────────────────────────────────────────────

  console.log("\n📥  Seeding EN source rows…");
  let enWritten = 0;

  if (!DRY_RUN) {
    const enRows = keys.map((key, i) => ({
      entity_type:    "ui",
      entity_id:      UI_ENTITY_ID,
      field:          key,
      language:       "en",
      value:          values[i],
      translated_by:  "human",
      source_locale:  "en",
      source_hash:    sourceHash(values[i]),
      is_stale:       false,
    }));

    // Upsert in batches of 100.
    for (const batch of chunk(enRows, 100)) {
      const { error } = await supabase
        .from("translations")
        .upsert(batch, { onConflict: "entity_type,entity_id,field,language" });
      if (error) {
        console.error("  ❌  EN upsert failed:", error.message);
        process.exit(1);
      }
      enWritten += batch.length;
    }
  } else {
    enWritten = keys.length;
  }
  console.log(`  ✅  ${enWritten} EN rows upserted`);

  if (EN_ONLY) {
    console.log("\n✅  --en-only mode: done.");
    return;
  }

  // ── 2) Load existing non-EN rows (to skip fresh AI rows) ─────────────────

  console.log("\n🔍  Loading existing translations to skip fresh rows…");
  const { data: existing } = await supabase
    .from("translations")
    .select("field, language, translated_by, source_hash")
    .eq("entity_type", "ui")
    .eq("entity_id", UI_ENTITY_ID)
    .neq("language", "en");

  type ExRow = { field: string; language: string; translated_by: string; source_hash: string | null };
  const existingMap = new Map<string, ExRow>();
  for (const r of (existing ?? []) as ExRow[]) {
    existingMap.set(`${r.field}:${r.language}`, r);
  }

  // ── 3) Translate each non-EN locale via DeepL ─────────────────────────────

  let totalChars = 0;
  let totalWritten = 0;
  let totalSkipped = 0;

  for (const locale of TARGET_LOCALES) {
    console.log(`\n🤖  Translating → ${locale}…`);

    // Glossary is locale-specific (EN → target). Load with the service-role
    // client so we don't fall through to the cookie-based createClient.
    const glossary = await loadGlossary(locale, supabase as never);

    // Decide which keys need translation.
    const toTranslate: Array<{ key: string; text: string; hash: string }> = [];
    let localeSkipped = 0;

    for (let i = 0; i < keys.length; i++) {
      const key  = keys[i];
      const text = values[i];
      const hash = sourceHash(text);
      const have = existingMap.get(`${key}:${locale}`);

      if (have) {
        // Never overwrite human translations.
        if (have.translated_by === "human") { localeSkipped++; continue; }
        // Skip AI rows whose source hasn't changed.
        if (have.source_hash === hash)       { localeSkipped++; continue; }
      }
      toTranslate.push({ key, text, hash });
    }

    console.log(`    ${toTranslate.length} to translate, ${localeSkipped} skipped`);
    totalSkipped += localeSkipped;

    if (toTranslate.length === 0) continue;

    const batches = chunk(toTranslate, DEEPL_BATCH);
    const translated: string[] = [];

    if (!DRY_RUN) {
      for (const batch of batches) {
        const result = await deepl.translateBatch(
          batch.map(x => x.text),
          "en",
          locale,
          { glossary },
        );
        translated.push(...result.translations);
        totalChars += result.charsBilled;
      }
    } else {
      // Dry-run: just echo back the source.
      translated.push(...toTranslate.map(x => `[${locale}] ${x.text}`));
    }

    // Upsert translated rows.
    const upsertRows = toTranslate.map((x, i) => ({
      entity_type:   "ui",
      entity_id:     UI_ENTITY_ID,
      field:         x.key,
      language:      locale,
      value:         translated[i],
      translated_by: "ai",
      source_locale: "en",
      source_hash:   x.hash,
      is_stale:      false,
    }));

    if (!DRY_RUN) {
      for (const batch of chunk(upsertRows, 100)) {
        const { error } = await supabase
          .from("translations")
          .upsert(batch, { onConflict: "entity_type,entity_id,field,language" });
        if (error) {
          console.error(`  ❌  ${locale} upsert failed:`, error.message);
          process.exit(1);
        }
      }
    }

    console.log(`    ✅  ${upsertRows.length} rows written`);
    totalWritten += upsertRows.length;
  }

  // ── 4) Summary ────────────────────────────────────────────────────────────

  console.log("\n─────────────────────────────────────────");
  console.log(`  EN rows upserted : ${enWritten}`);
  console.log(`  Non-EN written   : ${totalWritten}`);
  console.log(`  Non-EN skipped   : ${totalSkipped} (fresh or human)`);
  console.log(`  DeepL chars used : ${totalChars.toLocaleString()}`);
  if (DRY_RUN) console.log("  (DRY RUN — nothing written)");
  console.log("─────────────────────────────────────────\n");
}

main().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
