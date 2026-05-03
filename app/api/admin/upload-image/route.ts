import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs"; // sharp requires Node, not Edge

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB input limit (will compress to ~150KB output)

export async function POST(req: NextRequest) {
  // Admin check
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Parse form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new NextResponse("Invalid form data", { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const source = formData.get("source") as string | null;
  const slug = formData.get("slug") as string | null;
  const watermark = formData.get("watermark") === "true";
  const watermarkPosition = (formData.get("watermarkPosition") as string) || "southeast";
  const watermarkOpacity = Math.min(100, Math.max(0, Number(formData.get("watermarkOpacity") ?? 60)));

  if (!file || !source || !slug) {
    return new NextResponse("Missing file, source, or slug", { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // ── sharp processing pipeline ───────────────────────────────────────────
  const instance = sharp(inputBuffer)
    .rotate() // auto-orient from EXIF
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });

  // Optional watermark
  if (watermark) {
    try {
      // Get output dimensions before compositing
      const { width: outW = 1600 } = await instance.clone().metadata();
      const logoWidth = Math.max(80, Math.round(outW * 0.15));

      // Rasterize mark.svg → RGBA PNG, then scale alpha for opacity
      const svgPath = path.join(process.cwd(), "public", "logo", "mark.svg");
      const svgBuffer = await fs.readFile(svgPath);

      // Rasterize to raw RGBA pixels
      const { data: rawPixels, info } = await sharp(svgBuffer)
        .resize(logoWidth)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Scale alpha channel by watermarkOpacity / 100
      const opacityFactor = watermarkOpacity / 100;
      for (let i = 3; i < rawPixels.length; i += 4) {
        rawPixels[i] = Math.round(rawPixels[i] * opacityFactor);
      }

      const overlayBuffer = await sharp(rawPixels, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png()
        .toBuffer();

      instance.composite([
        {
          input: overlayBuffer,
          gravity: watermarkPosition as
            | "southeast"
            | "southwest"
            | "northeast"
            | "northwest",
          blend: "over",
        },
      ]);
    } catch (err) {
      // Watermark optional — log and continue without it
      console.warn("[upload-image] watermark failed, skipping:", err);
    }
  }

  let processed: Buffer;
  try {
    processed = await instance.webp({ quality: 85, effort: 4 }).toBuffer();
  } catch (err) {
    console.error("[upload-image] sharp error:", err);
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }

  // ── Upload to Supabase Storage ──────────────────────────────────────────
  const dir = slug.trim() || `_new_${Date.now()}`;
  const storagePath = `${source}s/${dir}/${dir}-hero.webp`;

  // Use admin client so upload bypasses RLS (anon key doesn't have storage insert)
  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from("service-images")
    .upload(storagePath, processed, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000", // 1 year — path is stable; re-upload replaces
    });

  if (uploadErr) {
    console.error("[upload-image] storage error:", uploadErr.message);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("service-images").getPublicUrl(storagePath);

  // Cache-bust the URL so the browser doesn't serve the old image after re-upload
  const url = `${publicUrl}?v=${Date.now()}`;

  return NextResponse.json({
    url,
    sizeBytes: processed.length,
  });
}
