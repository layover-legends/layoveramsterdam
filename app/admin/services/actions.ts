"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { syncOne } from "@/lib/stripe/sync";

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
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

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
  return { ok: true };
}

export async function updateAddonFields(
  addonId: string,
  fields: {
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
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

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
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create new services
// ─────────────────────────────────────────────────────────────────────────────

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

  const slug = normalizeSlug(fields.slug);
  if (!slug) return { error: "Slug is required" };

  const { data: existing } = await admin
    .from("tours")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { error: `Slug "${slug}" already exists` };

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

  const slug = normalizeSlug(fields.slug);
  if (!slug) return { error: "Slug is required" };

  // addons has UNIQUE (city_id, slug)
  const { data: existing } = await admin
    .from("addons")
    .select("id")
    .eq("slug", slug)
    .eq("city_id", fields.city_id)
    .maybeSingle();
  if (existing) return { error: `Slug "${slug}" already exists` };

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
