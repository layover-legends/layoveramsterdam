import "server-only";

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { encode as encodeBlurhash } from "blurhash";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateImage } from "@/lib/photos/moderation";
import {
  ASPECT_RATIOS, PHOTO_SIZES, PHOTO_FORMATS,
  type PhotoSource, type CropStrategy,
} from "@/lib/photos/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "photos";

// Aspect ratio → URL-safe filename segment ("16:9" → "16x9")
const ratioToFilename = (r: string) => r.replace(":", "x");

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function focalToCropOffset(
  focal: number,
  originalDim: number,
  outputDim: number
): number {
  const scaledFocal = focal * originalDim;
  const halfOutput  = outputDim / 2;
  return clamp(Math.round(scaledFocal - halfOutput), 0, originalDim - outputDim);
}

async function uploadVariant(
  admin: ReturnType<typeof createAdminClient>,
  storagePath: string,
  buf: Buffer,
  contentType: string
) {
  // 1-year immutable cache — variants are content-addressed (filename includes
  // ratio + size + format), so updating a photo creates new variants with new
  // photoId; old variants stay valid until garbage collected.
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buf, {
      contentType,
      upsert: true,
      cacheControl: "31536000, immutable",
    });
  if (error) throw new Error(`Storage upload failed [${storagePath}]: ${error.message}`);
}

async function detectFocalPoint(
  buf: Buffer,
  meta: sharp.Metadata
): Promise<{ x: number; y: number }> {
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

/**
 * Rasterise mark.svg to a PNG overlay at `variantWidth × 12%`, then scale
 * the alpha channel to `opacityPercent / 100`.  Returns the PNG buffer.
 */
async function buildWatermarkOverlay(
  svgBuffer: Buffer,
  variantWidth: number,
  opacityPercent: number
): Promise<Buffer> {
  const markWidth = Math.max(60, Math.round(variantWidth * 0.12));

  const { data: rawPixels, info } = await sharp(svgBuffer)
    .resize(markWidth)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const factor = Math.max(0.05, Math.min(1, opacityPercent / 100));
  for (let i = 3; i < rawPixels.length; i += 4) {
    rawPixels[i] = Math.round(rawPixels[i] * factor);
  }

  return sharp(rawPixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

type WatermarkResolved = {
  enabled:        boolean;
  position:       sharp.Gravity;
  opacityPercent: number;
};

// ── Public API ────────────────────────────────────────────────────────────────

export type ProcessUploadOptions = {
  source:             PhotoSource;
  altText:            string;
  uploadedBy:         string;
  relatedId?:         string;
  focalPoint?:        { x: number; y: number };
  tags?:              string[];
  copyrightHolder?:   string;
  licenseType?:       string;
  // Watermark overrides — undefined = resolve from site_settings defaults
  watermarkEnabled?:  boolean;
  watermarkPosition?: string;
  watermarkOpacity?:  number;
  /**
   * Async worker hint — when set, processUpload skips the dedup check + the
   * photos.insert and instead UPDATEs the existing row. Used by the
   * background job queue (lib/photos/process-job.ts) to fill in variants
   * for a photo that was previously inserted in 'pending' state by
   * /api/admin/upload-photo/finalize.
   */
  existingPhotoId?:   string;
};

export type ProcessedPhotoResult = {
  id:            string;
  cdnUrl:        string;
  blurhash:      string | null;
  dominantColor: string | null;
};

/**
 * Full smart-crop pipeline:
 * 1. Validate MIME type
 * 2. Strip EXIF
 * 3. Detect focal point (or use manual override)
 * 4. Compute blurhash + dominant color
 * 5. Resolve watermark policy (site_settings → per-upload override)
 * 6. Generate 45 variants (5 ratios × 3 sizes × 3 formats)
 *    — variant filenames use `x` not `:` to avoid URL parsing issues
 *    — watermark composited on applicable sources
 * 7. Insert photos row + return id + cdn_url
 */
export async function processUpload(
  file: Buffer,
  originalFilename: string,
  options: ProcessUploadOptions
): Promise<ProcessedPhotoResult> {
  if (!options.altText?.trim()) {
    throw new Error("alt_text is required — never upload a photo without describing it.");
  }

  // ── Deduplication: hash the original buffer and reuse existing photo if
  //    we've already processed this exact file. Saves ~10s of pipeline work
  //    plus 24 storage objects per duplicate. Skipped when called from the
  //    async worker (existingPhotoId set) — that row already exists.
  const fileHash = (await import("crypto"))
    .createHash("sha256").update(file).digest("hex");
  if (!options.existingPhotoId) {
    const adminEarly = createAdminClient();
    const { data: existingPhoto } = await adminEarly
      .from("photos")
      .select("id, cdn_url, blurhash, dominant_color")
      .eq("file_hash", fileHash)
      .maybeSingle();
    if (existingPhoto) {
      const e = existingPhoto as { id: string; cdn_url: string | null; blurhash: string | null; dominant_color: string | null };
      if (e.cdn_url) {
        return {
          id:             e.id,
          cdnUrl:         e.cdn_url,
          blurhash:       e.blurhash,
          dominantColor:  e.dominant_color,
        };
      }
    }
  }

  const meta = await sharp(file).metadata();
  const allowedFormats = ["jpeg", "jpg", "png", "webp", "heic", "heif", "avif", "tiff"];
  if (!meta.format || !allowedFormats.includes(meta.format)) {
    throw new Error(`Unsupported image format: ${meta.format ?? "unknown"}`);
  }

  // ── Image moderation (Sightengine, opt-in via env) ───────────────────────
  //   No-op + auto-approves when SIGHTENGINE_API_USER is unset (default).
  //   Hard-rejects high-confidence nudity/weapon/drugs/gore/offensive
  //   content; flags borderline cases for manual review.
  const moderation = await moderateImage(file);
  if (moderation.verdict === "rejected") {
    throw new Error(`Content rejected by moderation: ${moderation.reasons.join(", ")}`);
  }
  // moderation.verdict === "manual_review" → photo proceeds, but we'll set
  // moderation_status: "pending_review" on the photos row below so admin
  // can approve/reject in the UI.

  const photoId    = options.existingPhotoId ?? crypto.randomUUID();
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

  // ── Watermark policy resolution ───────────────────────────────────────────
  const admin = createAdminClient();

  const { data: wmData } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", [
      "watermark_default_enabled",
      "watermark_default_position",
      "watermark_default_opacity",
      "watermark_sources_enabled",
    ]);

  const wm = Object.fromEntries(
    (wmData ?? []).map((r) => [r.key, r.value as string | null])
  );

  const defaultEnabled  = wm.watermark_default_enabled !== "false";
  const defaultPosition = (wm.watermark_default_position ?? "southeast") as sharp.Gravity;
  const defaultOpacity  = parseInt(wm.watermark_default_opacity ?? "60", 10);
  const sourcesRaw: string = (wm.watermark_sources_enabled as string | null) ?? "tour,destination,marketing,about";
  const enabledSources  = sourcesRaw.split(",").map((src: string) => src.trim()).filter(Boolean);

  // review + customer_upload are NEVER watermarked (they're customer content)
  const neverWatermark: PhotoSource[] = ["review", "customer_upload"];
  const sourceAllowed = !neverWatermark.includes(options.source);

  const watermark: WatermarkResolved = {
    enabled: sourceAllowed && (
      options.watermarkEnabled !== undefined
        ? options.watermarkEnabled
        : (defaultEnabled && enabledSources.includes(options.source))
    ),
    position:       (options.watermarkPosition ?? defaultPosition) as sharp.Gravity,
    opacityPercent: options.watermarkOpacity ?? defaultOpacity,
  };

  // Read SVG once — reused for all variants
  let markSvgBuffer: Buffer | null = null;
  if (watermark.enabled) {
    try {
      markSvgBuffer = await fs.readFile(
        path.join(process.cwd(), "public", "logo", "mark.svg")
      );
    } catch {
      console.warn("[upload] public/logo/mark.svg not found — skipping watermark");
    }
  }

  // ── Generate 45 variants in parallel batches ─────────────────────────────
  // BATCH_SIZE = 6: sharp uses ~50-100 MB RAM per op on a 12 MP input.
  // Vercel Hobby = 1024 MB. 6 concurrent = ~600 MB peak — safe headroom.
  const BATCH_SIZE = 6;
  const ratiosGenerated: string[] = [];

  type VariantJob = {
    ar:       typeof ASPECT_RATIOS[number];
    size:     number;
    format:   typeof PHOTO_FORMATS[number];
    outW:     number;
    outH:     number;
    cropLeft: number | undefined;
    cropTop:  number | undefined;
    cropW:    number | undefined;
    cropH:    number | undefined;
    position: sharp.ResizeOptions["position"];
    wmOverlay: Buffer | null;
  };

  // Watermark overlay cached per variant width (5 sizes × 1 build = 5 builds max)
  const wmOverlayCache = new Map<number, Buffer>();

  // Build flat job list (CPU-light; runs sequentially to avoid memory spikes)
  const jobs: VariantJob[] = [];

  for (const ar of ASPECT_RATIOS) {
    for (const size of PHOTO_SIZES) {
      const outW = size;
      const outH = Math.round(size * ar.h / ar.w);

      let cropLeft: number | undefined;
      let cropTop:  number | undefined;
      let cropW:    number | undefined;
      let cropH:    number | undefined;
      const position: sharp.ResizeOptions["position"] =
        (meta.width && meta.height) ? "centre" : sharp.strategy.attention;

      if (meta.width && meta.height) {
        cropW    = Math.min(meta.width,  Math.round(meta.height * ar.w / ar.h));
        cropH    = Math.min(meta.height, Math.round(meta.width  * ar.h / ar.w));
        cropLeft = focalToCropOffset(focal.x, meta.width,  cropW);
        cropTop  = focalToCropOffset(focal.y, meta.height, cropH);
      }

      // Build watermark overlay once per size (cached across all formats + ratios at this size)
      if (watermark.enabled && markSvgBuffer && !wmOverlayCache.has(size)) {
        try {
          wmOverlayCache.set(
            size,
            await buildWatermarkOverlay(markSvgBuffer, size, watermark.opacityPercent)
          );
        } catch (err) {
          console.warn("[upload] watermark overlay build failed:", err);
        }
      }
      const wmOverlay = wmOverlayCache.get(size) ?? null;

      for (const fmt of PHOTO_FORMATS) {
        jobs.push({ ar, size, format: fmt, outW, outH, cropLeft, cropTop, cropW, cropH, position, wmOverlay });
      }
    }
    if (!ratiosGenerated.includes(ar.ratio)) ratiosGenerated.push(ar.ratio);
  }

  // Process one variant
  async function processVariant(job: VariantJob): Promise<void> {
    const variantPath = `${storagePath}${ratioToFilename(job.ar.ratio)}-${job.outW}.${job.format}`;
    try {
      let pipeline = sharp(file).rotate().withMetadata({ exif: {} });

      if (job.cropLeft !== undefined && job.cropTop !== undefined &&
          job.cropW    !== undefined && job.cropH  !== undefined) {
        pipeline = pipeline.extract({
          left:   job.cropLeft,
          top:    job.cropTop,
          width:  job.cropW,
          height: job.cropH,
        });
      }

      const croppedBuf = await pipeline
        .resize(job.outW, job.outH, { fit: "cover", position: job.position })
        .toBuffer();

      let finalPipeline: sharp.Sharp = sharp(croppedBuf);
      if (job.wmOverlay) {
        finalPipeline = finalPipeline.composite([{
          input:   job.wmOverlay,
          gravity: watermark.position,
          blend:   "over",
        }]);
      }

      const buf = await finalPipeline
        .toFormat(job.format as "avif" | "webp" | "jpeg", {
          quality: job.format === "avif" ? 60 : job.format === "webp" ? 80 : 82,
        })
        .toBuffer();

      await uploadVariant(admin, variantPath, buf,
        job.format === "jpeg" ? "image/jpeg" : `image/${job.format}`);
    } catch (err) {
      console.error(`[upload] variant ${variantPath} failed:`, err);
    }
  }

  // Run in batches of 6 — ~8 batches × ~500ms each ≈ 4s vs ~31s sequential
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    await Promise.all(jobs.slice(i, i + BATCH_SIZE).map(processVariant));
  }

  // ── Default CDN URL: 16x9 × 1200 WebP ────────────────────────────────────
  //   Uses NEXT_PUBLIC_PHOTOS_CDN_URL if set (Cloudflare Worker proxy),
  //   falls back to direct Supabase URL.
  const cdnBase = process.env.NEXT_PUBLIC_PHOTOS_CDN_URL
    ? `${process.env.NEXT_PUBLIC_PHOTOS_CDN_URL.replace(/\/$/, "")}/photos`
    : `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
  const cdnUrl = `${cdnBase}/${storagePath}16x9-1200.webp`;

  // ── Upsert photos row ────────────────────────────────────────────────────
  //   When existingPhotoId is set (worker path), the row already exists in
  //   'pending' state — upsert with onConflict updates it in place. Otherwise
  //   inserts a fresh row with the freshly minted photoId.
  const { error: insertErr } = await admin
    .from("photos")
    .upsert({
      id:                      photoId,
      storage_path:            storagePath,
      cdn_url:                 cdnUrl,
      source:                  options.source,
      related_id:              options.relatedId ?? null,
      alt_text:                options.altText.trim(),
      original_filename:       originalFilename,
      mime_type:               `image/${meta.format}`,
      width_px:                meta.width  ?? null,
      height_px:               meta.height ?? null,
      bytes:                   file.length,
      exif_stripped:           true,
      uploaded_by:             options.uploadedBy,
      is_public:               true,
      is_featured:             false,
      sort_order:              100,
      focal_point_x:           focal.x,
      focal_point_y:           focal.y,
      crop_strategy:           cropStrategy,
      aspect_ratios_generated: ratiosGenerated,
      blurhash,
      dominant_color:          dominantColor,
      tags:                    options.tags ?? [],
      copyright_holder:        options.copyrightHolder ?? "Layover Legends",
      license_type:            options.licenseType ?? "owned",
      nsfw_flag:               moderation.verdict === "manual_review",
      moderation_status:       moderation.verdict === "manual_review" ? "pending_review" : "auto_approved",
      moderation_notes:        moderation.reasons.length > 0 ? moderation.reasons.join(", ") : null,
      usage_count:             0,
      watermarked:             watermark.enabled,
      watermark_position:      watermark.enabled ? String(watermark.position) : null,
      watermark_opacity:       watermark.enabled ? watermark.opacityPercent  : null,
      file_hash:               fileHash,
      processing_status:       "ready",
    }, { onConflict: "id" });

  if (insertErr) throw new Error(`photos upsert failed: ${insertErr.message}`);

  return { id: photoId, cdnUrl, blurhash, dominantColor };
}

/**
 * Regenerate all variants for an existing photo (after focal point change).
 * Uses the same `x`-separator filename convention.
 */
export async function regenerateVariants(photoId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("photos")
    .select("storage_path, focal_point_x, focal_point_y, watermarked, watermark_position, watermark_opacity, source")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) throw new Error("Photo not found");

  const { data: original } = await admin.storage
    .from(BUCKET)
    .download(`${photo.storage_path}original`);

  if (!original) throw new Error("Original file not found in storage");

  const buf   = Buffer.from(await original.arrayBuffer());
  const focal = {
    x: (photo.focal_point_x as number | null) ?? 0.5,
    y: (photo.focal_point_y as number | null) ?? 0.5,
  };

  const watermark: WatermarkResolved = {
    enabled:        !!(photo.watermarked),
    position:       ((photo.watermark_position as string | null) ?? "southeast") as sharp.Gravity,
    opacityPercent: (photo.watermark_opacity as number | null) ?? 60,
  };

  let markSvgBuffer: Buffer | null = null;
  if (watermark.enabled) {
    try {
      markSvgBuffer = await fs.readFile(path.join(process.cwd(), "public", "logo", "mark.svg"));
    } catch { /* skip */ }
  }

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

      let wmOverlay: Buffer | null = null;
      if (watermark.enabled && markSvgBuffer) {
        try { wmOverlay = await buildWatermarkOverlay(markSvgBuffer, outW, watermark.opacityPercent); }
        catch { /* skip */ }
      }

      for (const fmt of PHOTO_FORMATS) {
        try {
          let pipeline = sharp(buf).rotate().withMetadata({ exif: {} });

          if (cropLeft !== undefined && cropTop !== undefined) {
            const scaledW = Math.min(meta.width!,  Math.round(meta.height! * ar.w / ar.h));
            const scaledH = Math.min(meta.height!, Math.round(meta.width!  * ar.h / ar.w));
            pipeline = pipeline.extract({ left: cropLeft, top: cropTop, width: scaledW, height: scaledH });
          }

          const croppedBuf = await pipeline
            .resize(outW, outH, { fit: "cover", position: "centre" })
            .toBuffer();

          let finalPipeline: sharp.Sharp = sharp(croppedBuf);
          if (wmOverlay) {
            finalPipeline = finalPipeline.composite([{
              input: wmOverlay, gravity: watermark.position, blend: "over",
            }]);
          }

          const variantBuf = await finalPipeline
            .toFormat(fmt as "avif" | "webp" | "jpeg", {
              quality: fmt === "avif" ? 60 : fmt === "webp" ? 80 : 82,
            })
            .toBuffer();

          await uploadVariant(
            admin,
            `${photo.storage_path}${ratioToFilename(ar.ratio)}-${outW}.${fmt}`,
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
