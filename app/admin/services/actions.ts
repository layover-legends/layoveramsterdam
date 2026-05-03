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
