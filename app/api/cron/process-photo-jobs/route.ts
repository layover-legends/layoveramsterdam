import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPhotoJob } from "@/lib/photos/process-job";

export const dynamic    = "force-dynamic";
export const runtime    = "nodejs";
export const maxDuration = 60;

/**
 * Drains the photo_processing_jobs queue. Runs every minute on Vercel Cron
 * + opportunistically on each /finalize call so users don't wait the full
 * minute when the queue is empty.
 *
 * Auth: same Bearer ${CRON_SECRET} pattern as other crons. The /finalize
 * fire-and-forget kick uses the same secret.
 *
 * Up to JOBS_PER_TICK photos processed per invocation (sequential — they
 * each fan out internally to 6-way parallel batches in processUpload).
 */
const JOBS_PER_TICK = 5;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const admin = createAdminClient();
  const processed: { photoId: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < JOBS_PER_TICK; i++) {
    const { data: claimed, error } = await admin.rpc("claim_next_photo_job");
    if (error) {
      console.error("[process-photo-jobs] claim_next_photo_job:", error.message);
      break;
    }
    if (!claimed || (Array.isArray(claimed) && claimed.length === 0)) {
      break; // queue empty
    }

    const job = Array.isArray(claimed) ? claimed[0] : claimed;
    const photoId = (job as { photo_id?: string }).photo_id;
    if (!photoId) break;

    const res = await processPhotoJob(photoId);
    processed.push({
      photoId,
      ok:    res.ok,
      error: res.ok ? undefined : res.error,
    });
  }

  return new Response(JSON.stringify({
    ok:        true,
    processed: processed.length,
    results:   processed,
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
