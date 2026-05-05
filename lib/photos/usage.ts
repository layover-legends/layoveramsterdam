import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PhotoUsageEntityType } from "@/lib/photos/types";

/**
 * Record that a photo is used by an entity.
 * Idempotent — safe to call on every save even if usage already recorded.
 */
export async function linkPhoto(
  photoId: string,
  entityType: PhotoUsageEntityType,
  entityId: string | null,
  fieldName: string,
  context?: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("photo_usage").upsert(
    {
      photo_id:    photoId,
      entity_type: entityType,
      entity_id:   entityId,
      field_name:  fieldName,
      context:     context ?? null,
    },
    { onConflict: "photo_id,entity_type,entity_id,field_name" }
  );
  if (error) console.error("[linkPhoto] error:", error.message);
}

/**
 * Remove a photo→entity usage link.
 * Call when an entity no longer references this photo.
 */
export async function unlinkPhoto(
  photoId: string,
  entityType: PhotoUsageEntityType,
  entityId: string | null,
  fieldName: string
): Promise<void> {
  const admin = createAdminClient();
  const query = admin
    .from("photo_usage")
    .delete()
    .eq("photo_id",    photoId)
    .eq("entity_type", entityType)
    .eq("field_name",  fieldName);

  if (entityId) {
    await query.eq("entity_id", entityId);
  } else {
    await query.is("entity_id", null);
  }
}

/**
 * Swap from one photo to another while keeping the usage record accurate.
 * Use when replacing a hero image with a new one.
 */
export async function relinkPhoto(
  oldPhotoId: string | null,
  newPhotoId: string,
  entityType: PhotoUsageEntityType,
  entityId: string | null,
  fieldName: string,
  context?: string
): Promise<void> {
  if (oldPhotoId && oldPhotoId !== newPhotoId) {
    await unlinkPhoto(oldPhotoId, entityType, entityId, fieldName);
  }
  await linkPhoto(newPhotoId, entityType, entityId, fieldName, context);
}

/**
 * Fetch all usage rows for a photo (for the "Used in X places" panel in admin).
 */
export async function getPhotoUsage(photoId: string): Promise<Array<{
  entity_type: string;
  entity_id:   string | null;
  field_name:  string;
  context:     string | null;
  created_at:  string;
}>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("photo_usage")
    .select("entity_type, entity_id, field_name, context, created_at")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Array<{
    entity_type: string;
    entity_id:   string | null;
    field_name:  string;
    context:     string | null;
    created_at:  string;
  }>;
}
