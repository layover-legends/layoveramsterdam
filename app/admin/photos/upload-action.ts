"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processUpload } from "@/lib/photos/upload";
import { linkPhoto, relinkPhoto } from "@/lib/photos/usage";
import type { PhotoSource, PhotoUsageEntityType } from "@/lib/photos/types";

export type UploadPhotoInput = {
  file: File;
  alt_text: string;
  source: PhotoSource;
  entity_type?: PhotoUsageEntityType;
  entity_id?: string;
  field_name?: string;
  replace_existing?: boolean;
  tags?: string[];
};

export type UploadPhotoResult =
  | { ok: true;  photo_id: string; cdn_url: string }
  | { ok: false; error: string };

const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadPhoto(
  input: UploadPhotoInput
): Promise<UploadPhotoResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "forbidden" };

  if (!input.alt_text || input.alt_text.trim().length < 3) {
    return { ok: false, error: "alt_text_required" };
  }
  if (input.file.size > MAX_BYTES) {
    return { ok: false, error: "file_too_large_20mb" };
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());

  let result: Awaited<ReturnType<typeof processUpload>>;
  try {
    result = await processUpload(buffer, input.file.name, {
      source: input.source,
      altText: input.alt_text.trim(),
      uploadedBy: user.id,
      tags: input.tags,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }

  // Link to entity slot if provided
  if (input.entity_type && input.entity_id && input.field_name) {
    if (input.replace_existing) {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("photo_usage")
        .select("photo_id")
        .eq("entity_type", input.entity_type)
        .eq("entity_id",   input.entity_id)
        .eq("field_name",  input.field_name)
        .maybeSingle() as { data: { photo_id: string } | null };

      await relinkPhoto(
        existing?.photo_id ?? null,
        result.id,
        input.entity_type,
        input.entity_id,
        input.field_name,
      );
    } else {
      await linkPhoto(result.id, input.entity_type, input.entity_id, input.field_name);
    }
  }

  await supabase.from("audit_logs").insert({
    user_id:    user.id,
    event_type: "photo_uploaded",
    payload: {
      photo_id:    result.id,
      source:      input.source,
      entity_type: input.entity_type  ?? null,
      entity_id:   input.entity_id   ?? null,
      field_name:  input.field_name  ?? null,
      filename:    input.file.name,
      bytes:       input.file.size,
    },
  });

  return { ok: true, photo_id: result.id, cdn_url: result.cdnUrl };
}
