"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createStaff, updateStaff, deleteStaff } from "@/lib/admin/staff";
import { createAdminClient } from "@/lib/supabase/admin";

function parseDate(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : null;
  return s || null;
}
function parseNum(v: FormDataEntryValue | null): number | null {
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  return isNaN(n) ? null : n;
}
function parseBool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

export async function upsertStaff(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string | null;
  const isNew = !id || id === "new";

  const values = {
    user_id:                    parseDate(formData.get("user_id")),
    role:                       (formData.get("role") as string) || "driver_guide",
    full_name:                  (formData.get("full_name") as string || "").trim(),
    preferred_name:             parseDate(formData.get("preferred_name")),
    phone:                      parseDate(formData.get("phone")),
    emergency_contact_name:     parseDate(formData.get("emergency_contact_name")),
    emergency_contact_phone:    parseDate(formData.get("emergency_contact_phone")),
    hire_date:                  parseDate(formData.get("hire_date")),
    hourly_rate_cents:          parseNum(formData.get("hourly_rate_cents")),
    daily_rate_cents:           parseNum(formData.get("daily_rate_cents")),
    payout_method:              parseDate(formData.get("payout_method")),
    bank_iban:                  parseDate(formData.get("bank_iban")),
    spoken_languages:           ((formData.get("spoken_languages") as string) || "").split(",").map((s) => s.trim()).filter(Boolean),
    driving_license_number:     parseDate(formData.get("driving_license_number")),
    driving_license_expiry:     parseDate(formData.get("driving_license_expiry")),
    taxi_pas_number:            parseDate(formData.get("taxi_pas_number")),
    taxi_pas_expiry:            parseDate(formData.get("taxi_pas_expiry")),
    first_aid_cert_expiry:      parseDate(formData.get("first_aid_cert_expiry")),
    background_check_date:      parseDate(formData.get("background_check_date")),
    background_check_expiry:    parseDate(formData.get("background_check_expiry")),
    notes:                      parseDate(formData.get("notes")),
    bio_short:                  parseDate(formData.get("bio_short")),
    is_active:                  parseBool(formData.get("is_active")) || true,
    max_tours_per_day:          parseNum(formData.get("max_tours_per_day")) ?? 3,
    status:                     parseDate(formData.get("status")) ?? "active",
    city_id:                    parseDate(formData.get("city_id")) ?? "00000000-0000-0000-0000-000000000000",
  };

  if (!values.full_name) {
    redirect("/admin/staff?error=full_name_required");
  }

  let staffId = id ?? "new";
  if (isNew) {
    staffId = await createStaff(values as Parameters<typeof createStaff>[0]);
  } else {
    await updateStaff(id!, values);
  }

  // Audit log
  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: isNew ? "staff_created" : "staff_updated",
    payload: { staff_id: staffId, full_name: values.full_name },
  });

  revalidatePath("/admin/staff");
  redirect(`/admin/staff/${staffId}?saved=1`);
}

export async function deactivateStaff(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string;
  await deleteStaff(id);

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: "staff_deactivated",
    payload: { staff_id: id },
  });

  revalidatePath("/admin/staff");
  redirect("/admin/staff?deleted=1");
}
