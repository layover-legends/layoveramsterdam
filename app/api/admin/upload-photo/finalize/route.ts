import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PhotoSource, PhotoUsageEntityType } from "@/lib/photos/types";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

/**
 * Step 3 of the async upload flow (after /init returned a signed URL and the
 * client uploaded directly to Supabase Storage).
 *
 * Inserts the photos row in 'pending' state with a placeholder cdn_url, and
 * enqueues a photo_processing_jobs entry. The variant pipeline runs out-of-band
 * (cron at /api/cron/process-photo-jobs) and updates processing_status='ready'
 * when done.
 *
 * Returns immediately — admin client shows "Processing…" until the row flips
 * to 'ready'. Total perceived upload time is bounded by network upload, not
 * pipeline work.
 */
export async function POST(req: NextRequest) {
  let admin_: { id: string };
  try {
    admin_ = await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 }); }

  const photoId       = String(body.photo_id ?? "");
  const originalPath  = String(body.original_path ?? "");
  const altText       = String(body.alt_text ?? "").trim();
  const source        = String(body.source ?? "marketing") as PhotoSource;
  const entityType    = body.entity_type ? String(body.entity_type) as PhotoUsageEntityType : undefined;
  const entityId      = body.entity_id   ? String(body.entity_id)   : undefined;
  const fieldName     = body.field_name  ? String(body.field_name)  : undefined;
  const tagsRaw       = body.tags;
  const tags          = Array.isArray(tagsRaw) ? tagsRaw.map(String) : undefined;
  const watermarkEnabled  = typeof body.watermark_enabled === "boolean" ? body.watermark_enabled : undefined;
  const watermarkPosition = body.watermark_position ? String(body.watermark_position) : undefined;
  const watermarkOpacity  = typeof body.watermark_opacity === "number" ? body.watermark_opacity : undefined;
  const filename = String(body.filename ?? "uploaded.jpg");

  if (!photoId || !originalPath) {
    return new Response(JSON.stringify({ error: "missing_photo_id_or_path" }), { status: 400 });
  }
  if (altText.length < 3) {
    return new Response(JSON.stringify({ error: "alt_text_required" }), { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Insert a placeholder photos row with processing_status='pending'.
  //    The variant pipeline will UPSERT the same id later with full metadata.
  const cdnBase = process.env.NEXT_PUBLIC_PHOTOS_CDN_URL
    ? `${process.env.NEXT_PUBLIC_PHOTOS_CDN_URL.replace(/\/$/, "")}/photos`
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos`;
  const placeholderCdnUrl = `${cdnBase}/${photoId}/16x9-1200.webp`;

  const { error: photoErr } = await admin.from("photos").insert({
    id:                photoId,
    storage_path:      `${photoId}/`,
    cdn_url:           placeholderCdnUrl,
    source,
    alt_text:          altText,
    original_filename: filename,
    uploaded_by:       admin_.id,
    is_public:         true,
    is_featured:       false,
    sort_order:        100,
    crop_strategy:     "attention",
    aspect_ratios_generated: [],
    tags:              tags ?? [],
    license_type:      "owned",
    copyright_holder:  "Layover Legends",
    nsfw_flag:         false,
    moderation_status: "auto_approved",
    usage_count:       0,
    exif_stripped:     false,
    processing_status: "pending",
  });
  if (photoErr) {
    console.error("[upload-photo/finalize] photos insert:", photoErr.message);
    return new Response(JSON.stringify({ error: photoErr.message }), { status: 500 });
  }

  // 2. Insert the job row
  const { error: jobErr } = await admin.from("photo_processing_jobs").insert({
    photo_id:      photoId,
    original_path: originalPath,
    options: {
      source,
      altText,
      uploadedBy:        admin_.id,
      tags,
      watermarkEnabled,
      watermarkPosition,
      watermarkOpacity,
      filename,
    },
  });
  if (jobErr) {
    console.error("[upload-photo/finalize] jobs insert:", jobErr.message);
    return new Response(JSON.stringify({ error: jobErr.message }), { status: 500 });
  }

  // 3. Optional: link to entity slot now (so it appears in the drawer
  //    immediately even though variants aren't done yet — the placeholder
  //    cdn_url won't render until variants land, but the link is in place)
  if (entityType && entityId && fieldName) {
    const { linkExistingPhoto } = await import("@/lib/photos/usage");
    try {
      await linkExistingPhoto(photoId, entityType, entityId, fieldName);
    } catch (err) {
      console.error("[upload-photo/finalize] link failed:", err);
    }
  }

  // 4. Best-effort kick: fire-and-forget call to the worker so the user
  //    doesn't have to wait for the next cron tick (max 1 minute lag).
  //    The cron is the safety net.
  const workerUrl = new URL("/api/cron/process-photo-jobs", req.url);
  fetch(workerUrl, {
    method: "GET",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  }).catch(() => { /* fire and forget */ });

  return new Response(JSON.stringify({ ok: true, photo_id: photoId, status: "pending" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
