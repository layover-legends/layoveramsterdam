"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

type Parsed = {
  category_id: string | null;
  name: string;
  slug: string;
  area: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_adult_only: boolean;
  is_seasonal: boolean;
  requires_booking: boolean;
  wheelchair_accessible: boolean;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseStop(formData: FormData):
  | { ok: true; data: Parsed }
  | { ok: false; error: string } {
  const name = (formData.get("name") || "").toString().trim();
  if (!name || name.length > 200) {
    return { ok: false, error: "Name is required (1–200 characters)." };
  }

  const slugRaw = (formData.get("slug") || "").toString().trim();
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) {
    return { ok: false, error: "Could not generate a slug from this name." };
  }

  const category_id =
    (formData.get("category_id") || "").toString().trim() || null;

  const area = (formData.get("area") || "").toString().trim() || null;
  const description = (formData.get("description") || "").toString().trim() || null;

  const latRaw = (formData.get("latitude") || "").toString().trim();
  const lngRaw = (formData.get("longitude") || "").toString().trim();
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (latRaw) {
    const n = Number(latRaw);
    if (Number.isNaN(n) || n < -90 || n > 90)
      return { ok: false, error: "Latitude must be between -90 and 90." };
    latitude = n;
  }
  if (lngRaw) {
    const n = Number(lngRaw);
    if (Number.isNaN(n) || n < -180 || n > 180)
      return { ok: false, error: "Longitude must be between -180 and 180." };
    longitude = n;
  }
  if ((latitude === null) !== (longitude === null)) {
    return { ok: false, error: "Provide both latitude and longitude, or leave both blank." };
  }

  return {
    ok: true,
    data: {
      category_id,
      name,
      slug,
      area,
      description,
      latitude,
      longitude,
      is_active: formData.get("is_active") === "on",
      is_adult_only: formData.get("is_adult_only") === "on",
      is_seasonal: formData.get("is_seasonal") === "on",
      requires_booking: formData.get("requires_booking") === "on",
      wheelchair_accessible: formData.get("wheelchair_accessible") === "on",
    },
  };
}

function extOf(file: File): string {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? "bin";
}

async function storagePathFromUrl(url: string): Promise<string | null> {
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf("/assets/");
    if (idx === -1) return null;
    return u.pathname.slice(idx + "/assets/".length);
  } catch {
    return null;
  }
}

export async function createStop(formData: FormData) {
  await requireAdmin();
  const parsed = parseStop(formData);
  if (!parsed.ok) {
    redirect(`/admin/stops/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from("destinations")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !inserted) {
    redirect(
      `/admin/stops/new?error=${encodeURIComponent(error?.message ?? "Could not create stop")}`,
    );
  }

  revalidatePath("/admin/stops");
  revalidatePath("/");
  redirect(`/admin/stops/${inserted.id}?saved=1`);
}

export async function updateStop(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseStop(formData);
  if (!parsed.ok) {
    redirect(`/admin/stops/${id}?error=${encodeURIComponent(parsed.error)}`);
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("destinations")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    redirect(
      `/admin/stops/${id}?error=${encodeURIComponent("Save failed: " + error.message)}`,
    );
  }

  revalidatePath("/admin/stops");
  revalidatePath(`/admin/stops/${id}`);
  revalidatePath("/");
  redirect(`/admin/stops/${id}?saved=1`);
}

export async function deleteStop(id: string) {
  await requireAdmin();
  const supabase = createClient();

  // Clean up Storage files first.
  const { data: photos } = await supabase
    .from("stop_photos")
    .select("url")
    .eq("destination_id", id);
  const paths: string[] = [];
  for (const p of photos ?? []) {
    const path = await storagePathFromUrl(p.url);
    if (path) paths.push(path);
  }
  if (paths.length) {
    await supabase.storage.from("assets").remove(paths);
  }

  const { error } = await supabase.from("destinations").delete().eq("id", id);
  if (error) {
    redirect(
      `/admin/stops/${id}?error=${encodeURIComponent("Delete failed: " + error.message)}`,
    );
  }

  revalidatePath("/admin/stops");
  revalidatePath("/");
  redirect("/admin/stops?deleted=1");
}

/**
 * Upload one photo for a destination. Becomes primary if the destination
 * has no other photos yet.
 */
export async function addPhoto(destinationId: string, formData: FormData) {
  await requireAdmin();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/stops/${destinationId}?error=${encodeURIComponent("Pick an image first.")}`);
  }
  const f = file as File;
  if (!ALLOWED_IMAGE_TYPES.has(f.type)) {
    redirect(`/admin/stops/${destinationId}?error=${encodeURIComponent("Image must be JPEG, PNG, WebP or GIF.")}`);
  }
  if (f.size > MAX_IMAGE_BYTES) {
    redirect(`/admin/stops/${destinationId}?error=${encodeURIComponent("Image must be 5 MB or smaller.")}`);
  }

  const supabase = createClient();

  const path = `stops/${destinationId}/${Date.now()}.${extOf(f)}`;
  const buf = await f.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from("assets")
    .upload(path, buf, { contentType: f.type, upsert: false, cacheControl: "3600" });
  if (upErr) {
    redirect(`/admin/stops/${destinationId}?error=${encodeURIComponent("Upload failed: " + upErr.message)}`);
  }
  const url = supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;

  // Make this the primary photo if the destination has none yet.
  const { count } = await supabase
    .from("stop_photos")
    .select("id", { count: "exact", head: true })
    .eq("destination_id", destinationId);
  const isPrimary = (count ?? 0) === 0;

  await supabase.from("stop_photos").insert({
    destination_id: destinationId,
    url,
    alt_text: null,
    is_primary: isPrimary,
  });

  revalidatePath(`/admin/stops/${destinationId}`);
  revalidatePath("/admin/stops");
  revalidatePath("/");
  redirect(`/admin/stops/${destinationId}?saved=1`);
}

export async function deletePhoto(destinationId: string, photoId: string) {
  await requireAdmin();
  const supabase = createClient();

  const { data: photo } = await supabase
    .from("stop_photos")
    .select("id, url, is_primary")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) {
    redirect(`/admin/stops/${destinationId}?error=${encodeURIComponent("Photo not found.")}`);
  }

  const path = await storagePathFromUrl(photo.url);
  if (path) await supabase.storage.from("assets").remove([path]);
  await supabase.from("stop_photos").delete().eq("id", photoId);

  // Promote another photo to primary if we just removed the primary one.
  if (photo.is_primary) {
    const { data: next } = await supabase
      .from("stop_photos")
      .select("id")
      .eq("destination_id", destinationId)
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("stop_photos").update({ is_primary: true }).eq("id", next.id);
    }
  }

  revalidatePath(`/admin/stops/${destinationId}`);
  revalidatePath("/admin/stops");
  revalidatePath("/");
  redirect(`/admin/stops/${destinationId}?saved=1`);
}

export async function makePrimaryPhoto(destinationId: string, photoId: string) {
  await requireAdmin();
  const supabase = createClient();
  await supabase
    .from("stop_photos")
    .update({ is_primary: false })
    .eq("destination_id", destinationId);
  await supabase.from("stop_photos").update({ is_primary: true }).eq("id", photoId);

  revalidatePath(`/admin/stops/${destinationId}`);
  revalidatePath("/admin/stops");
  revalidatePath("/");
  redirect(`/admin/stops/${destinationId}?saved=1`);
}
