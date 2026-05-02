#!/usr/bin/env tsx
/**
 * scripts/fix-deepl-entities.ts
 *
 * One-shot fix for AI translation rows that contain raw HTML entities
 * emitted by DeepL's tag_handling=html mode (e.g. &#x27; instead of ').
 *
 * Now that postprocess() in lib/i18n/providers/deepl.ts decodes entities,
 * new translations will be clean. This script repairs any existing rows
 * that were written before the fix landed.
 *
 * Safe to re-run — rows that already look clean are skipped.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx scripts/fix-deepl-entities.ts            real run
 *   npx tsx scripts/fix-deepl-entities.ts --dry-run  print affected rows, no writes
 */

import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const p of [".env.local", ".env"]) {
  const abs = resolve(process.cwd(), p);
  if (existsSync(abs)) {
    try { loadEnvFile(abs); } catch { /* pre-20.12 */ }
    break;
  }
}

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// HTML entity pattern — any of the five entities DeepL emits.
const ENTITY_RE = /&#x27;|&#39;|&quot;|&lt;|&gt;|&amp;/i;

function decode(text: string): string {
  return text
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g,   "'")
    .replace(/&quot;/g,  '"')
    .replace(/&lt;/g,    "<")
    .replace(/&gt;/g,    ">")
    .replace(/&amp;/g,   "&");   // last — avoids double-decode
}

async function main() {
  console.log(`\n🔧  fix-deepl-entities${DRY_RUN ? "  (DRY RUN)" : ""}`);

  // Fetch all AI rows in pages of 1 000.
  const PAGE = 1000;
  type Row = { id: string; value: string };
  const affected: Row[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("translations")
      .select("id, value")
      .eq("translated_by", "ai")
      .range(from, from + PAGE - 1);

    if (error) { console.error("❌  fetch error:", error.message); process.exit(1); }
    const batch = (data ?? []) as Row[];
    for (const row of batch) {
      if (ENTITY_RE.test(row.value)) affected.push(row);
    }
    if (batch.length < PAGE) break;
  }

  console.log(`   ${affected.length} rows contain HTML entities`);
  if (affected.length === 0) { console.log("   Nothing to fix.\n"); return; }

  if (DRY_RUN) {
    for (const r of affected.slice(0, 20)) {
      console.log(`   ${r.id}  "${r.value.slice(0, 80)}"`);
    }
    if (affected.length > 20) console.log(`   … and ${affected.length - 20} more`);
    console.log();
    return;
  }

  // Update in batches of 100.
  let fixed = 0;
  const BATCH = 100;
  for (let i = 0; i < affected.length; i += BATCH) {
    const slice = affected.slice(i, i + BATCH);
    // Supabase JS doesn't support batch updates by id list, so we do individual upserts.
    for (const row of slice) {
      const decoded = decode(row.value);
      const { error } = await supabase
        .from("translations")
        .update({ value: decoded })
        .eq("id", row.id);
      if (error) console.warn(`   ⚠️  ${row.id}: ${error.message}`);
      else fixed++;
    }
    process.stdout.write(`\r   Fixed ${Math.min(i + BATCH, affected.length)}/${affected.length}…`);
  }

  console.log(`\n   ✅  ${fixed} rows updated.\n`);
}

main().catch((e) => {
  console.error("❌ fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
