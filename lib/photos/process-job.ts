import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { processUpload } from "@/lib/photos/upload";
import type { PhotoSource } from "@/lib/photos/types";

const ORIGINALS_BUCKET = "photos";

/**
 * Process a single photo_processing_job: pull the original buffer from storage,
 * run the smart-crop pipeline, mark the photos row as ready (or failed).
 *
 * This is the worker side of the async upload flow. Uploads land as 'pending'
 * with only the original in storage; this function turns them into 'ready'
 * with all 24 variants.
 *
 * Idempotent: safe to call multiple times for the same photo_id; on success,
 * the photos row already exists from /finalize, so processUpload is told to
 * SKIP DB insert and just generate variants.
 */
export async function processPhotoJob(photoId: string): Promise<{
  ok: true;
  cdn_url: string;
} | {
  ok: false;
  error: string;
}> {
  const admin = createAdminClient();

  const { data: jobRow } = await admin
    .from("photo_processing_jobs")
    .select("photo_id, original_path, options")
    .eq("photo_id", photoId)
    .maybeSingle();
  if (!jobRow) return { ok: false, error: "job_not_found" };
  const job = jobRow as { photo_id: string; original_path: string; options: Record<string, unknown> };

  try {
    // 1. Mark the photo as processing
    await admin.from("photos")
      .update({ processing_status: "processing" })
      .eq("id", photoId);

    // 2. Download the original from storage
    const { data: blob, error: dlErr } = await admin.storage
      .from(ORIGINALS_BUCKET)
      .download(job.original_path);
    if (dlErr || !blob) throw new Error(`download_failed: ${dlErr?.message ?? "unknown"}`);
    const buffer = Buffer.from(await blob.arrayBuffer());

    // 3. Run the smart-crop pipeline against the existing photo row
    //    (regenerateVariantsOnly=true tells processUpload to skip the row insert
    //    and just write variants + update the existing row's metadata)
    const opts = job.options as {
      source:             PhotoSource;
      altText:            string;
      uploadedBy:         string;
      tags?:              string[];
      watermarkEnabled?:  boolean;
      watermarkPosition?: string;
      watermarkOpacity?:  number;
      filename:           string;
    };

    const result = await processUpload(buffer, opts.filename, {
      source:             opts.source,
      altText:            opts.altText,
      uploadedBy:         opts.uploadedBy,
      tags:               opts.tags,
      watermarkEnabled:   opts.watermarkEnabled,
      watermarkPosition:  opts.watermarkPosition,
      watermarkOpacity:   opts.watermarkOpacity,
      // Hint to processUpload that the photos row already exists with this id
      // — see processUpload's existingPhotoId branch.
      existingPhotoId:    photoId,
    });

    // 4. Mark ready + record cdn_url + complete the job
    await admin.from("photos")
      .update({ processing_status: "ready", cdn_url: result.cdnUrl })
      .eq("id", photoId);
    await admin.from("photo_processing_jobs")
      .update({ completed_at: new Date().toISOString() })
      .eq("photo_id", photoId);

    return { ok: true, cdn_url: result.cdnUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[processPhotoJob] failed for ${photoId}:`, msg);

    // Bump attempts, leave job for retry. After 5 attempts the claim RPC
    // will skip it and we mark photos.processing_status='failed' below.
    const { data: jobAfter } = await admin
      .from("photo_processing_jobs")
      .select("attempts")
      .eq("photo_id", photoId)
      .maybeSingle();
    const attempts = (jobAfter as { attempts: number } | null)?.attempts ?? 0;

    await admin.from("photo_processing_jobs")
      .update({ last_error: msg, started_at: null })
      .eq("photo_id", photoId);

    if (attempts >= 5) {
      await admin.from("photos")
        .update({ processing_status: "failed" })
        .eq("id", photoId);
    }
    return { ok: false, error: msg };
  }
}
