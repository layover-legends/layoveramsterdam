"use server";

import { createClient } from "@/lib/supabase/server";
import { linkExistingPhoto } from "@/lib/photos/usage";
import type { PhotoUsageEntityType } from "@/lib/photos/types";

export type LinkPhotoResult =
  | { ok: true }
  | { ok: false; error: string };

export async function linkPhotoToEntity(
  photoId: string,
  entityType: PhotoUsageEntityType,
  entityId: string,
  fieldName: string,
): Promise<LinkPhotoResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: profile } = await supabase
    .from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "forbidden" };

  try {
    await linkExistingPhoto(photoId, entityType, entityId, fieldName);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
