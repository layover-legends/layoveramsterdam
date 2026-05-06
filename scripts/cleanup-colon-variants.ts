/**
 * One-shot cleanup: delete photos whose storage variants use `:` in the filename
 * (the pre-9d.5d naming convention that broke URL fetching).
 *
 * Run AFTER deploying the 9d.5d code:
 *   node --env-file=.env.local --import tsx scripts/cleanup-colon-variants.ts
 *
 * For each affected photo:
 *   1. Lists files under photos/{id}/
 *   2. Deletes all variant files from Supabase Storage
 *   3. Deletes the photos row (CASCADE removes photo_usage rows)
 *   4. Logs the original filename so you know what to re-upload
 *
 * Safe to re-run — already-deleted photos simply produce 0 matching files.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("cleanup-colon-variants — finding affected photos…\n");

  const { data: photos, error } = await admin
    .from("photos")
    .select("id, storage_path, original_filename, alt_text, source, usage_count");

  if (error) { console.error("DB query failed:", error.message); process.exit(1); }

  let cleaned = 0;
  let skipped  = 0;

  for (const photo of photos ?? []) {
    // List all files stored under this photo's folder
    const folderId = photo.id as string;
    const { data: files } = await admin.storage
      .from("photos")
      .list(folderId);

    const hasColon = (files ?? []).some((f) => f.name.includes(":"));
    if (!hasColon) { skipped++; continue; }

    console.log(`Found: ${folderId}  (${photo.original_filename ?? "unknown"}, source=${photo.source})`);
    console.log(`  Alt text: "${photo.alt_text}"`);
    console.log(`  Usage count: ${photo.usage_count}`);

    // Delete all variant files
    const paths = (files ?? []).map((f) => `${folderId}/${f.name}`);
    const { error: rmErr } = await admin.storage.from("photos").remove(paths);
    if (rmErr) {
      console.error(`  Storage delete failed: ${rmErr.message}`);
      continue;
    }
    console.log(`  Deleted ${paths.length} variant files from storage.`);

    // Delete the photos row (CASCADE removes photo_usage)
    const { error: dbErr } = await admin.from("photos").delete().eq("id", folderId);
    if (dbErr) {
      console.error(`  DB delete failed: ${dbErr.message}`);
      continue;
    }
    console.log(`  Deleted photos row (+ any photo_usage links via CASCADE).`);
    console.log(`  → Re-upload "${photo.original_filename ?? "this photo"}" via /admin/assets/upload\n`);
    cleaned++;
  }

  console.log("─────────────────────────────────────────");
  console.log(`Cleaned : ${cleaned} photo(s) with colon variants`);
  console.log(`Skipped : ${skipped} photo(s) already using correct filenames`);

  if (cleaned > 0) {
    console.log("\nNext step: re-upload the deleted photo(s) via /admin/assets/upload");
    console.log("The new pipeline generates variant filenames with 'x' (e.g. 16x9-1200.webp).");
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
