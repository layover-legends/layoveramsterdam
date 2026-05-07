"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaveImageResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Persist a tour's or addon's hero image_url WITHOUT going through the full
 * Save & sync to Stripe flow. Lets the admin keep their other in-progress
 * edits in the drawer while just locking in the new image.
 *
 * The actual upload pipeline already wrote the cdn_url to the column on
 * upload completion (see upload-action.ts ENTITY_IMAGE_COLUMNS), so calling
 * this is mostly idempotent — but it also revalidates the cache so the
 * public site picks up the change immediately.
 */
export async function saveServiceImage(
  serviceId: string,
  source: "tour" | "addon",
  imageUrl: string | null,
): Promise<SaveImageResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "forbidden" };

  const table = source === "tour" ? "tours" : "addons";
  const admin = createAdminClient();
  const { error } = await admin
    .from(table)
    .update({ image_url: imageUrl })
    .eq("id", serviceId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    user_id:    user.id,
    event_type: "service_image_saved",
    payload:    { service_id: serviceId, source, image_url: imageUrl },
  });

  // Revalidate everything that displays this image
  revalidatePath("/shop");
  revalidatePath(`/shop/${serviceId}`);
  revalidatePath("/tours");
  revalidatePath(`/tours/${serviceId}`);
  revalidatePath("/admin/services");

  return { ok: true };
}
