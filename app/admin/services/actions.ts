"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { syncOne } from "@/lib/stripe/sync";
import { slugify, uniqueSlug } from "@/lib/slug";
import { insertSlugRedirect } from "@/lib/admin/redirects";

export type AvailabilityStatus = "active" | "coming_soon" | "inactive";

export async function updateServiceAvailability(
  serviceId: string,
  status: AvailabilityStatus,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("addons")
    .update({ availability_status: status })
    .eq("id", serviceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/services");
  revalidatePath("/shop");
  return { ok: true };
}

export async function updateServiceFields(
  serviceId: string,
  fields: {
    price_cents?: number;
    cogs_cents?: number | null;
    vat_rate?: number;
    sort_order?: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("addons").update(fields).eq("id", serviceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/services");
  return { ok: true };
}

export async function updateTourActive(
  tourId: string,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("tours")
    .update({ is_active: isActive })
    .eq("id", tourId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/services");
  revalidatePath("/tours");
  return { ok: true };
}

export type TourFieldsUpdate = {
  slug?: string;
  name?: string;
  description?: string | null;
  tagline?: string | null;
  price_cents?: number;
  vat_rate?: number;
  pricing_model?: string;
  min_group_size?: number;
  max_group_size?: number | null;
  transport_mode?: string;
  delivery_mode?: string;
  duration_hours?: number | null;
  is_adult_only?: boolean;
  launch_mode?: boolean;
  is_active?: boolean;
  image_url?: string | null;
};

export async function updateTourFields(
  tourId: string,
  fields: TourFieldsUpdate,
  originalFields: { name?: string; description?: string | null; tagline?: string | null },
): Promise<{ ok: boolean; error?: string; newImageUrl?: string | null }> {
  await requireAdmin();
  const admin = createAdminClient();

  let migratedImageUrl: string | null = null;

  if (fields.slug !== undefined) {
    const newSlug = slugify(fields.slug);
    fields = { ...fields, slug: newSlug };

    const { data: oldRow } = await admin
      .from("tours")
      .select("slug, image_url")
      .eq("id", tourId)
      .single();

    if (oldRow && oldRow.slug !== newSlug) {
      const { data: conflict } = await admin
        .from("tours")
        .select("id")
        .eq("slug", newSlug)
        .neq("id", tourId)
        .maybeSingle();
      if (conflict) return { ok: false, error: `Slug "${newSlug}" already exists` };

      const userUploadedNewImage =
        fields.image_url !== undefined && fields.image_url !== oldRow.image_url;
      if (oldRow.image_url && !userUploadedNewImage) {
        migratedImageUrl = await migrateImageOnSlugChange({
          source: "tour",
          oldSlug: oldRow.slug,
          newSlug,
          oldImageUrl: oldRow.image_url,
        });
        if (migratedImageUrl) fields = { ...fields, image_url: migratedImageUrl };
      }

      // Register 301 redirect for the old slug (best-effort).
      await insertSlugRedirect({ entityType: "tour", oldSlug: oldRow.slug, newSlug }).catch(() => {});
    }
  }

  const { error } = await admin.from("tours").update(fields).eq("id", tourId);

  if (error) return { ok: false, error: error.message };

  // Mark translations stale for any changed text fields so DeepL re-runs
  const staleFields: string[] = [];
  if (fields.name !== undefined && fields.name !== originalFields.name) staleFields.push("name");
  if (fields.tagline !== undefined && fields.tagline !== originalFields.tagline) staleFields.push("tagline");
  if (fields.description !== undefined && fields.description !== originalFields.description) staleFields.push("description");

  if (staleFields.length > 0) {
    await admin
      .from("translations")
      .update({ is_stale: true })
      .eq("entity_type", "tour")
      .eq("entity_id", tourId)
      .in("field", staleFields)
      .neq("language", "en");
  }

  revalidatePath("/admin/services");
  revalidatePath("/tours");
  return { ok: true, newImageUrl: migratedImageUrl };
}

export async function updateAddonFields(
  addonId: string,
  fields: {
    slug?: string;
    name?: string;
    description?: string | null;
    price_cents?: number;
    cogs_cents?: number | null;
    vat_rate?: number;
    sort_order?: number;
    pricing_model?: string;
    service_type?: string;
    availability_status?: string;
    category?: string;
    fulfillment?: string;
    image_url?: string | null;
  },
  originalFields: { name?: string; description?: string | null },
): Promise<{ ok: boolean; error?: string; newImageUrl?: string | null }> {
  await requireAdmin();
  const admin = createAdminClient();

  let migratedImageUrl: string | null = null;

  if (fields.slug !== undefined) {
    const newSlug = slugify(fields.slug);
    fields = { ...fields, slug: newSlug };

    const { data: oldRow } = await admin
      .from("addons")
      .select("slug, image_url, city_id")
      .eq("id", addonId)
      .single();

    if (oldRow && oldRow.slug !== newSlug) {
      const { data: conflict } = await admin
        .from("addons")
        .select("id")
        .eq("slug", newSlug)
        .eq("city_id", oldRow.city_id)
        .neq("id", addonId)
        .maybeSingle();
      if (conflict) return { ok: false, error: `Slug "${newSlug}" already exists` };

      const userUploadedNewImage =
        fields.image_url !== undefined && fields.image_url !== oldRow.image_url;
      if (oldRow.image_url && !userUploadedNewImage) {
        migratedImageUrl = await migrateImageOnSlugChange({
          source: "addon",
          oldSlug: oldRow.slug,
          newSlug,
          oldImageUrl: oldRow.image_url,
        });
        if (migratedImageUrl) fields = { ...fields, image_url: migratedImageUrl };
      }

      // Register 301 redirect for the old slug (best-effort).
      await insertSlugRedirect({ entityType: "addon", oldSlug: oldRow.slug, newSlug }).catch(() => {});
    }
  }

  const { error } = await admin.from("addons").update(fields).eq("id", addonId);

  if (error) return { ok: false, error: error.message };

  // Mark translations stale for changed text
  const staleFields: string[] = [];
  if (fields.name !== undefined && fields.name !== originalFields.name) staleFields.push("name");
  if (fields.description !== undefined && fields.description !== originalFields.description) staleFields.push("description");

  if (staleFields.length > 0) {
    await admin
      .from("translations")
      .update({ is_stale: true })
      .eq("entity_type", "addon")
      .eq("entity_id", addonId)
      .in("field", staleFields)
      .neq("language", "en");
  }

  revalidatePath("/admin/services");
  revalidatePath("/shop");
  return { ok: true, newImageUrl: migratedImageUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create new services
// ─────────────────────────────────────────────────────────────────────────────

async function migrateImageOnSlugChange(opts: {
  source: "tour" | "addon";
  oldSlug: string;
  newSlug: string;
  oldImageUrl: string | null;
}): Promise<string | null> {
  if (!opts.oldImageUrl || opts.oldSlug === opts.newSlug) return null;

  const admin = createAdminClient();
  const oldPath = `${opts.source}s/${opts.oldSlug}/${opts.oldSlug}-hero.webp`;
  const newPath = `${opts.source}s/${opts.newSlug}/${opts.newSlug}-hero.webp`;

  const { data: oldFile, error: dlError } = await admin.storage
    .from("service-images")
    .download(oldPath);

  if (dlError || !oldFile) {
    console.warn(`[migrateImage] not found at ${oldPath} during slug rename`);
    return null;
  }

  await admin.storage.from("service-images").upload(newPath, oldFile, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "31536000",
  });

  // Best-effort delete of old path
  await admin.storage.from("service-images").remove([oldPath]);

  const {
    data: { publicUrl },
  } = admin.storage.from("service-images").getPublicUrl(newPath);

  return `${publicUrl}?v=${Date.now()}`;
}

export type CreateTourFields = {
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  price_cents: number;
  vat_rate: number;
  pricing_model: string;
  min_group_size: number;
  max_group_size: number | null;
  transport_mode: string;
  delivery_mode: string;
  duration_hours: number | null;
  is_adult_only: boolean;
  launch_mode: boolean;
  is_active: boolean;
  image_url: string | null;
  city_id: string;
};

export async function createTour(
  fields: CreateTourFields,
): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  if (!fields.slug?.trim()) return { error: "Slug is required" };
  const slug = await uniqueSlug({ base: fields.slug, table: "tours", supabase: admin });

  const { data: row, error: insertErr } = await admin
    .from("tours")
    .insert({ ...fields, slug, currency: "EUR" })
    .select("id")
    .single();

  if (insertErr || !row) return { error: insertErr?.message ?? "Insert failed" };

  // Sync to Stripe immediately (creates Product + Price)
  await syncOne({ kind: "tour", id: row.id }).catch(() => {});

  revalidatePath("/admin/services");
  revalidatePath("/tours");
  return { id: row.id };
}

export type CreateAddonFields = {
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  cogs_cents: number | null;
  vat_rate: number;
  sort_order: number;
  pricing_model: string;
  service_type: string;
  availability_status: string;
  category: string;
  fulfillment: string;
  image_url: string | null;
  city_id: string;
};

export async function createAddon(
  fields: CreateAddonFields,
): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  if (!fields.slug?.trim()) return { error: "Slug is required" };
  // addons has UNIQUE (city_id, slug) — uniqueSlug handles collision by appending -2/-3
  const slug = await uniqueSlug({
    base: fields.slug,
    table: "addons",
    cityId: fields.city_id,
    supabase: admin,
  });

  const { data: row, error: insertErr } = await admin
    .from("addons")
    .insert({ ...fields, slug, is_active: true })
    .select("id")
    .single();

  if (insertErr || !row) return { error: insertErr?.message ?? "Insert failed" };

  // Sync to Stripe immediately
  await syncOne({ kind: "addon", id: row.id }).catch(() => {});

  revalidatePath("/admin/services");
  revalidatePath("/shop");
  return { id: row.id };
}

export async function loadWaitlistEmails(
  serviceId: string,
): Promise<{ email: string; created_at: string; locale: string | null }[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from("service_interest")
    .select("email, created_at, locale")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false });

  return (data ?? []) as { email: string; created_at: string; locale: string | null }[];
}
