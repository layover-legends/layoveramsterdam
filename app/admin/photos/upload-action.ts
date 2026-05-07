"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processUpload } from "@/lib/photos/upload";
import { linkPhoto, relinkPhoto } from "@/lib/photos/usage";
import type { PhotoSource, PhotoUsageEntityType } from "@/lib/photos/types";

export type UploadPhotoResult =
  | { ok: true;  photo_id: string; cdn_url: string }
  | { ok: false; error: string };

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Server Action — accepts FormData (Next.js 14 only supports File via FormData,
 * never inside a plain object — passing { file: File, ... } fails client-side
 * with "Only plain objects, and a few built-ins, can be passed to Server Actions").
 *
 * FormData fields:
 *   file               — File (required)
 *   alt_text           — string (required, ≥ 3 chars)
 *   source             — PhotoSource (required)
 *   entity_type        — PhotoUsageEntityType (optional)
 *   entity_id          — string (optional)
 *   field_name         — string (optional)
 *   replace_existing   — "true" | "false" (optional)
 *   tags               — comma-separated string (optional)
 *   watermark_enabled  — "true" | "false" (optional; absent = use site default)
 *   watermark_position — string (optional)
 *   watermark_opacity  — numeric string (optional)
 */
export async function uploadPhoto(formData: FormData): Promise<UploadPhotoResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "forbidden" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "no_file" };

  const altText = String(formData.get("alt_text") ?? "").trim();
  if (altText.length < 3) return { ok: false, error: "alt_text_required" };
  if (file.size > MAX_BYTES) return { ok: false, error: "file_too_large_20mb" };

  const source = String(formData.get("source") ?? "marketing") as PhotoSource;

  const entityTypeRaw = formData.get("entity_type");
  const entityType    = entityTypeRaw ? String(entityTypeRaw) as PhotoUsageEntityType : undefined;
  const entityIdRaw   = formData.get("entity_id");
  const entityId      = entityIdRaw   ? String(entityIdRaw)   : undefined;
  const fieldNameRaw  = formData.get("field_name");
  const fieldName     = fieldNameRaw  ? String(fieldNameRaw)  : undefined;

  const replaceExisting = String(formData.get("replace_existing") ?? "") === "true";

  const tagsRaw = formData.get("tags");
  const tags = tagsRaw
    ? String(tagsRaw).split(",").map(t => t.trim()).filter(Boolean)
    : undefined;

  const wmEnabledRaw = formData.get("watermark_enabled");
  const watermarkEnabled =
    wmEnabledRaw === null || wmEnabledRaw === ""
      ? undefined
      : String(wmEnabledRaw) === "true";

  const wmPositionRaw = formData.get("watermark_position");
  const watermarkPosition = wmPositionRaw ? String(wmPositionRaw) : undefined;

  const wmOpacityRaw = formData.get("watermark_opacity");
  const watermarkOpacity =
    wmOpacityRaw === null || wmOpacityRaw === ""
      ? undefined
      : Number(wmOpacityRaw);

  const buffer = Buffer.from(await file.arrayBuffer());

  let result: Awaited<ReturnType<typeof processUpload>>;
  try {
    result = await processUpload(buffer, file.name, {
      source,
      altText,
      uploadedBy:        user.id,
      tags,
      watermarkEnabled,
      watermarkPosition,
      watermarkOpacity,
    });
  } catch (err) {
    console.error("[upload-action] processUpload failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }

  // Link to entity slot if provided
  if (entityType && entityId && fieldName) {
    try {
      if (replaceExisting) {
        const admin = createAdminClient();
        const { data: existing } = await admin
          .from("photo_usage")
          .select("photo_id")
          .eq("entity_type", entityType)
          .eq("entity_id",   entityId)
          .eq("field_name",  fieldName)
          .maybeSingle() as { data: { photo_id: string } | null };

        await relinkPhoto(
          existing?.photo_id ?? null,
          result.id,
          entityType,
          entityId,
          fieldName,
        );
      } else {
        await linkPhoto(result.id, entityType, entityId, fieldName);
      }

      // Also update the legacy image-URL column on the entity table so the
      // public site (/shop, tour detail, blog) immediately reflects the new
      // image without requiring a separate "Save" click on the edit drawer.
      // Maps (entity_type, field_name) → (table, column).
      const ENTITY_IMAGE_COLUMNS: Record<string, { table: string; column: string }> = {
        "tour:hero_image":     { table: "tours",    column: "image_url" },
        "staff:photo":         { table: "staff",    column: "photo_url" },
        "staff:hero_image":    { table: "staff",    column: "photo_url" },
        "article:cover":       { table: "articles", column: "cover_url" },
        "article:hero_image":  { table: "articles", column: "cover_url" },
      };
      const slot = `${entityType}:${fieldName}`;
      const target = ENTITY_IMAGE_COLUMNS[slot];
      if (target) {
        const admin = createAdminClient();
        const { error: colErr } = await admin
          .from(target.table)
          .update({ [target.column]: result.cdnUrl })
          .eq("id", entityId);
        if (colErr) {
          console.error(`[upload-action] failed to update ${target.table}.${target.column}:`, colErr.message);
        }
      }
    } catch (err) {
      console.error("[upload-action] linkPhoto failed:", err);
      // Don't fail the whole upload — the photo is in the library, just unlinked
    }
  }

  await supabase.from("audit_logs").insert({
    user_id:    user.id,
    event_type: "photo_uploaded",
    payload: {
      photo_id:    result.id,
      source,
      entity_type: entityType ?? null,
      entity_id:   entityId   ?? null,
      field_name:  fieldName  ?? null,
      filename:    file.name,
      bytes:       file.size,
    },
  });

  return { ok: true, photo_id: result.id, cdn_url: result.cdnUrl };
}
