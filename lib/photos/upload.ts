import "server-only";

import sharp from "sharp";
import { encode as encodeBlurhash } from "blurhash";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ASPECT_RATIOS, PHOTO_SIZES, PHOTO_FORMATS,
  type PhotoSource, type CropStrategy,
} from "@/lib/photos/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "photos";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Given a focal point (0-1) and output size, return the best crop offset. */
function focalToCropOffset(
  focal: number,
  originalDim: number,
  outputDim: number
): number {
  const scaledFocal = focal * originalDim;
  const halfOutput  = outputDim / 2;
  return clamp(Math.round(scaledFocal - halfOutput), 0, originalDim - outputDim);
}

/** Upload a buffer to Supabase Storage. */
async function uploadVariant(admin: ReturnType<typeof createAdminClient>, path: string, buf: Buffer, contentType: string) {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed [${path}]: ${error.message}`);
}

/** Attempt to detect focal point via sharp attention crop. */
async function detectFocalPoint(buf: Buffer, meta: sharp.Metadata): Promise<{ x: number; y: number }> {
  if (!meta.width || !meta.height) return { x: 0.5, y: 0.5 };
  try {
    const { info } = await sharp(buf)
      .resize(200, 200, { fit: "cover", position: sharp.strategy.attention })
      .toBuffer({ resolveWithObject: true });
    const extInfo = info as typeof info & { cropOffsets?: { left: number; top: number } };
    const left = extInfo.cropOffsets?.left ?? 0;
    const top  = extInfo.cropOffsets?.top  ?? 0;
    const scaleX = meta.width  / 200;
    const scaleY = meta.height / 200;
    return {
      x: clamp((left * scaleX + 100 * scaleX) / meta.width,  0, 1),
      y: clamp((top  * scaleY + 100 * scaleY) / meta.height, 0, 1),
    };
  } catch {
    return { x: 0.5, y: 0.5 };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type ProcessUploadOptions = {
  source: PhotoSource;
  altText: string;
  uploadedBy: string;
  relatedId?: string;
  focalPoint?: { x: number; y: number };
  tags?: string[];
  copyrightHolder?: string;
  licenseType?: string;
};

export type ProcessedPhotoResult = {
  id: string;
  cdnUrl: string;
  blurhash: string | null;
  dominantColor: string | null;
};

/**
 * Full smart-crop pipeline:
 * 1. Validate MIME
 * 2. Strip EXIF
 * 3. Detect focal point (or use manual override)
 * 4. Compute blurhash + dominant color
 * 5. Generate 45 variants (5 ratios × 3 sizes × 3 formats)
 * 6. Insert photos row + return id + cdn_url
 */
export async function processUpload(
  file: Buffer,
  originalFilename: string,
  options: ProcessUploadOptions
): Promise<ProcessedPhotoResult> {
  if (!options.altText?.trim()) {
    throw new Error("alt_text is required — never upload a photo without describing it.");
  }

  const meta = await sharp(file).metadata();
  const allowedFormats = ["jpeg", "jpg", "png", "webp", "heic", "heif", "avif", "tiff"];
  if (!meta.format || !allowedFormats.includes(meta.format)) {
    throw new Error(`Unsupported image format: ${meta.format ?? "unknown"}`);
  }

  // Generate stable UUID for this photo
  const photoId = crypto.randomUUID();
  const storagePath = `${photoId}/`;

  // ── Blurhash ──────────────────────────────────────────────────────────────
  let blurhash: string | null = null;
  try {
    const { data: thumbData, info: thumbInfo } = await sharp(file)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    blurhash = encodeBlurhash(
      new Uint8ClampedArray(thumbData),
      thumbInfo.width,
      thumbInfo.height,
      4, 3
    );
  } catch { /* non-fatal */ }

  // ── Dominant color ────────────────────────────────────────────────────────
  let dominantColor: string | null = null;
  try {
    const stats = await sharp(file).stats();
    const d = stats.dominant;
    dominantColor = "#" + [d.r, d.g, d.b]
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("");
  } catch { /* non-fatal */ }

  // ── Focal point ───────────────────────────────────────────────────────────
  const focal = options.focalPoint ?? await detectFocalPoint(file, meta);
  const cropStrategy: CropStrategy = options.focalPoint ? "manual_focal" : "attention";

  // ── Generate variants ─────────────────────────────────────────────────────
  const admin = createAdminClient();
  const ratiosGenerated: string[] = [];

  for (const ar of ASPECT_RATIOS) {
    for (const size of PHOTO_SIZES) {
      const outW = size;
      const outH = Math.round(size * ar.h / ar.w);

      // Compute crop position from focal point
      let cropLeft: number | undefined;
      let cropTop:  number | undefined;
      let position: sharp.ResizeOptions["position"] = sharp.strategy.attention;

      if (meta.width && meta.height) {
        const scaledW = Math.min(meta.width,  Math.round(meta.height * ar.w / ar.h));
        const scaledH = Math.min(meta.height, Math.round(meta.width  * ar.h / ar.w));
        cropLeft = focalToCropOffset(focal.x, meta.width,  scaledW);
        cropTop  = focalToCropOffset(focal.y, meta.height, scaledH);
      }

      for (const fmt of PHOTO_FORMATS) {
        const variantPath = `${storagePath}${ar.ratio}-${outW}.${fmt}`;
        try {
          let pipeline = sharp(file).rotate().withMetadata({ exif: {} });

          if (cropLeft !== undefined && cropTop !== undefined) {
            const scaledW = Math.min(meta.width!,  Math.round(meta.height! * ar.w / ar.h));
            const scaledH = Math.min(meta.height!, Math.round(meta.width!  * ar.h / ar.w));
            pipeline = pipeline.extract({
              left:   cropLeft,
              top:    cropTop,
              width:  scaledW,
              height: scaledH,
            });
            position = "centre";
          }

          const buf = await pipeline
            .resize(outW, outH, { fit: "cover", position })
            .toFormat(fmt as "avif" | "webp" | "jpeg", {
              quality: fmt === "avif" ? 60 : fmt === "webp" ? 80 : 82,
            })
            .toBuffer();

          await uploadVariant(admin, variantPath, buf,
            fmt === "jpeg" ? "image/jpeg" : `image/${fmt}`);
        } catch (err) {
          console.error(`[upload] variant ${variantPath} failed:`, err);
          // Non-fatal — skip this variant
        }
      }
    }
    if (!ratiosGenerated.includes(ar.ratio)) ratiosGenerated.push(ar.ratio);
  }

  // ── Build default CDN URL (16:9 × 1200 WebP) ─────────────────────────────
  const cdnUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}16:9-1200.webp`;

  // ── Insert photos row ─────────────────────────────────────────────────────
  const { data: photoRow, error: insertErr } = await admin
    .from("photos")
    .insert({
      id:                     photoId,
      storage_path:           storagePath,
      cdn_url:                cdnUrl,
      source:                 options.source,
      related_id:             options.relatedId ?? null,
      alt_text:               options.altText.trim(),
      original_filename:      originalFilename,
      mime_type:              `image/${meta.format}`,
      width_px:               meta.width  ?? null,
      height_px:              meta.height ?? null,
      bytes:                  file.length,
      exif_stripped:          true,
      uploaded_by:            options.uploadedBy,
      is_public:              true,
      is_featured:            false,
      sort_order:             100,
      focal_point_x:          focal.x,
      focal_point_y:          focal.y,
      crop_strategy:          cropStrategy,
      aspect_ratios_generated: ratiosGenerated,
      blurhash,
      dominant_color:         dominantColor,
      tags:                   options.tags ?? [],
      copyright_holder:       options.copyrightHolder ?? "Layover Legends",
      license_type:           options.licenseType ?? "owned",
      nsfw_flag:              false,
      moderation_status:      "auto_approved",
      usage_count:            0,
    })
    .select("id")
    .single();

  if (insertErr) throw new Error(`photos insert failed: ${insertErr.message}`);

  return {
    id:            photoId,
    cdnUrl,
    blurhash,
    dominantColor,
  };
}

/**
 * Regenerate all variants for an existing photo (after focal point change).
 */
export async function regenerateVariants(photoId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("photos")
    .select("storage_path, focal_point_x, focal_point_y")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) throw new Error("Photo not found");

  // Download the original from storage
  const { data: original } = await admin.storage
    .from(BUCKET)
    .download(`${photo.storage_path}original`);

  if (!original) throw new Error("Original file not found in storage");

  const buf = Buffer.from(await original.arrayBuffer());
  const focal = {
    x: (photo.focal_point_x as number | null) ?? 0.5,
    y: (photo.focal_point_y as number | null) ?? 0.5,
  };

  // Re-run variant generation (no DB insert needed — just overwrite storage files)
  const meta = await sharp(buf).metadata();

  for (const ar of ASPECT_RATIOS) {
    for (const size of PHOTO_SIZES) {
      const outW = size;
      const outH = Math.round(size * ar.h / ar.w);

      let cropLeft: number | undefined;
      let cropTop:  number | undefined;

      if (meta.width && meta.height) {
        const scaledW = Math.min(meta.width,  Math.round(meta.height * ar.w / ar.h));
        const scaledH = Math.min(meta.height, Math.round(meta.width  * ar.h / ar.w));
        cropLeft = focalToCropOffset(focal.x, meta.width,  scaledW);
        cropTop  = focalToCropOffset(focal.y, meta.height, scaledH);
      }

      for (const fmt of PHOTO_FORMATS) {
        try {
          let pipeline = sharp(buf).rotate().withMetadata({ exif: {} });

          if (cropLeft !== undefined && cropTop !== undefined) {
            const scaledW = Math.min(meta.width!,  Math.round(meta.height! * ar.w / ar.h));
            const scaledH = Math.min(meta.height!, Math.round(meta.width!  * ar.h / ar.w));
            pipeline = pipeline.extract({ left: cropLeft, top: cropTop, width: scaledW, height: scaledH });
          }

          const variantBuf = await pipeline
            .resize(outW, outH, { fit: "cover", position: "centre" })
            .toFormat(fmt as "avif" | "webp" | "jpeg", {
              quality: fmt === "avif" ? 60 : fmt === "webp" ? 80 : 82,
            })
            .toBuffer();

          await uploadVariant(
            admin,
            `${photo.storage_path}${ar.ratio}-${outW}.${fmt}`,
            variantBuf,
            fmt === "jpeg" ? "image/jpeg" : `image/${fmt}`
          );
        } catch (err) {
          console.error(`[regenerate] variant failed:`, err);
        }
      }
    }
  }

  await admin.from("photos")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", photoId);
}
