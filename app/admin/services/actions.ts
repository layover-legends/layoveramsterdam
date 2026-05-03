"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

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
