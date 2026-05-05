import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { processUpload } from "@/lib/photos/upload";
import type { PhotoSource } from "@/lib/photos/types";

const VALID_SOURCES: PhotoSource[] = [
  "tour","staff","vehicle","destination","about","marketing","customer_upload","review"
];
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  // Auth check
  let adminUser: { id: string };
  try {
    adminUser = await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const formData = await req.formData();
  const file    = formData.get("file") as File | null;
  const altText = (formData.get("alt_text") as string | null)?.trim() ?? "";
  const source  = (formData.get("source")   as string | null)?.trim() as PhotoSource;
  const tags    = ((formData.get("tags")    as string | null) ?? "")
    .split(",").map((t) => t.trim()).filter(Boolean);
  const relatedId = (formData.get("related_id") as string | null)?.trim() || undefined;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded." }), { status: 400 });
  }
  if (!altText) {
    return new Response(JSON.stringify({ error: "alt_text is required." }), { status: 400 });
  }
  if (!VALID_SOURCES.includes(source)) {
    return new Response(JSON.stringify({ error: `Invalid source: ${source}` }), { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: `File too large (max 20MB). Got ${Math.round(file.size/1024/1024)}MB.` }), { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const result = await processUpload(buf, file.name, {
      source,
      altText,
      uploadedBy: adminUser.id,
      relatedId,
      tags,
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-photo]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
