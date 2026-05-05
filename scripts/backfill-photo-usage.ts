/**
 * One-shot script: populate photo_usage from existing entity photo references.
 * Run once after Phase 9d.1 ships:
 *   npx tsx scripts/backfill-photo-usage.ts
 *
 * The photos table uses UUID IDs. Current entity tables store photo_url (text URL)
 * not photo_id FKs — so this script only backfills where a URL can be matched back
 * to a photos.cdn_url. Future saves will use linkPhoto() correctly.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backfill() {
  console.log("🔗 Backfilling photo_usage from existing entity photo references…");
  let total = 0;

  // Load all photos keyed by cdn_url for fast lookup
  const { data: allPhotos } = await supabase
    .from("photos")
    .select("id, cdn_url");

  if (!allPhotos?.length) {
    console.log("No photos in DB yet — nothing to backfill.");
    return;
  }

  const urlToId = new Map<string, string>();
  for (const p of allPhotos as { id: string; cdn_url: string | null }[]) {
    if (p.cdn_url) urlToId.set(p.cdn_url, p.id);
  }

  // Tours — image_url
  const { data: tours } = await supabase
    .from("tours")
    .select("id, image_url")
    .not("image_url", "is", null);

  for (const t of (tours ?? []) as { id: string; image_url: string }[]) {
    const photoId = urlToId.get(t.image_url);
    if (!photoId) continue;
    await supabase.from("photo_usage").upsert({
      photo_id: photoId, entity_type: "tour", entity_id: t.id, field_name: "hero",
    }, { onConflict: "photo_id,entity_type,entity_id,field_name" });
    total++;
  }

  // Staff — photo_url
  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, photo_url")
    .not("photo_url", "is", null);

  for (const s of (staffRows ?? []) as { id: string; photo_url: string }[]) {
    const photoId = urlToId.get(s.photo_url);
    if (!photoId) continue;
    await supabase.from("photo_usage").upsert({
      photo_id: photoId, entity_type: "staff", entity_id: s.id, field_name: "avatar",
    }, { onConflict: "photo_id,entity_type,entity_id,field_name" });
    total++;
  }

  console.log(`✅ Backfilled ${total} photo_usage rows.`);
}

backfill().catch(console.error);
