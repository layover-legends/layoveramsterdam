/**
 * One-shot backfill: migrate legacy image_url / photo_url columns into the
 * photos table so all historical images are visible in /admin/assets and
 * can be re-cropped via the smart-crop pipeline.
 *
 * Run once after deploying phase 9d.5:
 *   node --env-file=.env.local --import tsx scripts/backfill-legacy-images.ts
 *
 * Idempotent — re-running skips already-migrated rows (those with an existing
 * photo_usage entry OR whose image_url already contains "/photos/" in the path).
 *
 * After running:
 *   1. Sweep /admin/assets and fix placeholder alt-text on every backfilled photo.
 *   2. Verify the photo appears in /admin/assets with correct dimensions.
 */

import { createClient } from "@supabase/supabase-js";
import { processUpload } from "../lib/photos/upload";
import type { PhotoSource } from "../lib/photos/types";

const SUPABASE_URL           = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

type EntityConfig = {
  table:    string;
  field:    string;
  source:   PhotoSource;
  entity:   string;         // matches PhotoUsageEntityType
  slot:     string;         // field_name in photo_usage
};

const ENTITY_FIELDS: EntityConfig[] = [
  { table: "tours",        field: "image_url",  source: "tour",        entity: "tour",        slot: "hero_image"  },
  { table: "destinations", field: "image_url",  source: "destination", entity: "destination", slot: "main_image"  },
  { table: "staff",        field: "photo_url",  source: "staff",       entity: "staff",       slot: "avatar"      },
];

let totalProcessed = 0;
let totalSkipped   = 0;
let totalFailed    = 0;

async function backfillEntity(cfg: EntityConfig) {
  console.log(`\n── ${cfg.table}.${cfg.field} ──────────────────────────────`);

  const { data: rows, error: fetchErr } = await admin
    .from(cfg.table)
    .select(`id, ${cfg.field}`)
    .not(cfg.field, "is", null)
    .neq(cfg.field, "");

  if (fetchErr) {
    console.error(`  [error] fetch failed: ${fetchErr.message}`);
    return;
  }

  const candidates = (rows ?? []) as Array<{ id: string; [k: string]: string | null }>;
  console.log(`  ${candidates.length} rows with non-null ${cfg.field}`);

  for (const row of candidates) {
    const url = row[cfg.field] as string;

    // Skip if already processed through new pipeline
    if (url.includes("/storage/v1/object/public/photos/")) {
      totalSkipped++;
      continue;
    }

    // Skip if photo_usage already exists for this slot
    const { data: existingUsage } = await admin
      .from("photo_usage")
      .select("photo_id")
      .eq("entity_type", cfg.entity)
      .eq("entity_id",   row.id)
      .eq("field_name",  cfg.slot)
      .maybeSingle();

    if (existingUsage) {
      totalSkipped++;
      continue;
    }

    // Fetch the image bytes
    let buffer: Buffer;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        console.warn(`  [skip] ${row.id} — HTTP ${resp.status} for ${url}`);
        totalSkipped++;
        continue;
      }
      buffer = Buffer.from(await resp.arrayBuffer());
    } catch (err) {
      console.warn(`  [skip] ${row.id} — fetch failed: ${err instanceof Error ? err.message : err}`);
      totalSkipped++;
      continue;
    }

    // Detect mime from URL or default to webp
    const ext  = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "webp";
    const mime = ext === "jpg" ? "image/jpeg"
               : ext === "png" ? "image/png"
               : ext === "avif" ? "image/avif"
               : "image/webp";

    const filename = url.split("?")[0].split("/").pop() ?? `${cfg.slot}.webp`;

    // Run smart-crop pipeline
    let result: { id: string; cdnUrl: string };
    try {
      result = await processUpload(buffer, filename, {
        source:      cfg.source,
        altText:     `${cfg.table} image (backfilled — please update alt text)`,
        uploadedBy:  "system-backfill",
        relatedId:   row.id,
      });
    } catch (err) {
      console.error(`  [fail] ${row.id} — processUpload: ${err instanceof Error ? err.message : err}`);
      totalFailed++;
      continue;
    }

    // Insert photo_usage link
    const { error: usageErr } = await admin.from("photo_usage").insert({
      photo_id:    result.id,
      entity_type: cfg.entity,
      entity_id:   row.id,
      field_name:  cfg.slot,
      context:     "backfill",
    });

    if (usageErr) {
      console.error(`  [fail] ${row.id} — photo_usage insert: ${usageErr.message}`);
      totalFailed++;
      continue;
    }

    // Update the legacy URL to the new CDN URL
    const { error: updateErr } = await admin
      .from(cfg.table)
      .update({ [cfg.field]: result.cdnUrl })
      .eq("id", row.id);

    if (updateErr) {
      console.warn(`  [warn] ${row.id} — failed to update ${cfg.field}: ${updateErr.message}`);
    }

    console.log(`  ✓ ${row.id} → photo ${result.id}`);
    totalProcessed++;
  }
}

async function main() {
  console.log("Layover Legends — backfill-legacy-images.ts");
  console.log("============================================");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log("");

  for (const cfg of ENTITY_FIELDS) {
    await backfillEntity(cfg);
  }

  console.log("\n── Summary ──────────────────────────────────────────");
  console.log(`  Processed : ${totalProcessed}`);
  console.log(`  Skipped   : ${totalSkipped}  (already migrated or no image)`);
  console.log(`  Failed    : ${totalFailed}`);
  console.log("");

  if (totalProcessed > 0) {
    console.log("Next steps:");
    console.log("  1. Sweep /admin/assets and fix placeholder alt-text on backfilled photos.");
    console.log("  2. Hard-refresh any public pages to see new CDN URLs.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
