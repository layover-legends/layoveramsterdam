"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeletePhotosResult =
  | { ok: true;  deleted: number }
  | { ok: false; error: string };

/**
 * Delete one or more photos from the asset library.
 *
 * Performs in order:
 *   1. List + delete every variant in storage (24 files per photo)
 *   2. Null out any legacy image_url columns pointing at these photos
 *      (tours.image_url, staff.photo_url, articles.cover_url)
 *   3. Delete photo_usage rows
 *   4. Delete photos rows
 *   5. Audit log
 *
 * Continues on per-photo errors — returns count of successfully deleted rows.
 */
export async function deletePhotos(ids: string[]): Promise<DeletePhotosResult> {
  if (!ids || ids.length === 0) return { ok: false, error: "no_ids" };
  if (ids.length > 200)         return { ok: false, error: "too_many" };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "forbidden" };

  const admin = createAdminClient();

  // Resolve cdn_urls so we can null out legacy image_url columns referencing them
  const { data: photoRows } = await admin
    .from("photos")
    .select("id, cdn_url, storage_path")
    .in("id", ids);
  const rows = (photoRows ?? []) as { id: string; cdn_url: string | null; storage_path: string | null }[];
  if (rows.length === 0) return { ok: false, error: "not_found" };

  let deleted = 0;
  for (const row of rows) {
    try {
      // 1. Delete every storage object under {photoId}/
      const prefix = row.storage_path ?? `${row.id}/`;
      const { data: objects } = await admin.storage
        .from("photos")
        .list(prefix.replace(/\/$/, ""), { limit: 100 });
      if (objects && objects.length > 0) {
        const paths = objects.map((o) => `${prefix.replace(/\/$/, "")}/${o.name}`);
        const { error: rmErr } = await admin.storage.from("photos").remove(paths);
        if (rmErr) console.error(`[deletePhotos] storage.remove failed for ${row.id}:`, rmErr.message);
      }

      // 2. Null out legacy image columns (best-effort — failures don't block delete)
      if (row.cdn_url) {
        await Promise.all([
          admin.from("tours").update({ image_url: null }).eq("image_url", row.cdn_url),
          admin.from("staff").update({ photo_url: null }).eq("photo_url", row.cdn_url),
          admin.from("articles").update({ cover_url: null }).eq("cover_url", row.cdn_url),
        ]);
      }

      // 3. Delete photo_usage rows
      await admin.from("photo_usage").delete().eq("photo_id", row.id);

      // 4. Delete photos row
      const { error: photoErr } = await admin.from("photos").delete().eq("id", row.id);
      if (photoErr) {
        console.error(`[deletePhotos] photos.delete failed for ${row.id}:`, photoErr.message);
        continue;
      }
      deleted += 1;
    } catch (err) {
      console.error(`[deletePhotos] failed for ${row.id}:`, err);
    }
  }

  // 5. Audit
  await supabase.from("audit_logs").insert({
    user_id:    user.id,
    event_type: "photos_deleted",
    payload: { count: deleted, ids: rows.map((r) => r.id) },
  });

  revalidatePath("/admin/assets");
  return { ok: true, deleted };
}
