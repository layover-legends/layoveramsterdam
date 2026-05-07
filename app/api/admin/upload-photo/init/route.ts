import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

/**
 * Step 1 of the async upload flow — return a signed URL the client can PUT to
 * directly. Bypasses Vercel's 4.5MB server-action body limit and lets users
 * upload 10–20MB phone photos without timing out.
 *
 * Flow:
 *   POST /api/admin/upload-photo/init
 *     body: { extension: "jpg" | "png" | "webp" | "heic" | ... }
 *     → 200 { photo_id, signed_url, original_path, expires_at }
 *
 *   client PUTs the file directly to signed_url
 *
 *   POST /api/admin/upload-photo/finalize
 *     body: { photo_id, alt_text, source, entity_type?, entity_id?, ... }
 *     → 200 { ok: true, photo_id }   (status: pending)
 *
 *   /api/cron/process-photo-jobs picks up the pending row and generates variants.
 */
export async function POST(req: NextRequest) {
  let admin_: { id: string };
  try {
    admin_ = await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: { extension?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }

  const allowedExt = ["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "tiff"];
  const extRaw = String(body.extension ?? "").toLowerCase().replace(/^\./, "");
  if (!allowedExt.includes(extRaw)) {
    return new Response(JSON.stringify({ error: "invalid_extension", allowed: allowedExt }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const photoId      = crypto.randomUUID();
  const originalPath = `originals/${photoId}.${extRaw}`;
  const admin = createAdminClient();

  const { data: signed, error } = await admin.storage
    .from("photos")
    .createSignedUploadUrl(originalPath);

  if (error || !signed) {
    console.error("[upload-photo/init] createSignedUploadUrl:", error?.message);
    return new Response(JSON.stringify({ error: error?.message ?? "signed_url_failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    photo_id:      photoId,
    signed_url:    signed.signedUrl,
    token:         signed.token,
    original_path: originalPath,
    uploaded_by:   admin_.id,
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
