"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createVehicle, updateVehicle, deleteVehicle } from "@/lib/admin/vehicles";
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

export async function upsertVehicle(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string | null;
  const isNew = !id || id === "new";

  const values = {
    nickname:                (formData.get("nickname") as string || "").trim(),
    vehicle_type:            (formData.get("vehicle_type") as string) || "van",
    make:                    parseDate(formData.get("make")),
    model:                   parseDate(formData.get("model")),
    year:                    parseNum(formData.get("year")),
    license_plate:           parseDate(formData.get("license_plate")),
    vin:                     parseDate(formData.get("vin")),
    color:                   parseDate(formData.get("color")),
    seats:                   parseNum(formData.get("seats")),
    wheelchair_accessible:   parseBool(formData.get("wheelchair_accessible")),
    purchase_date:           parseDate(formData.get("purchase_date")),
    purchase_price_cents:    parseNum(formData.get("purchase_price_cents")),
    odometer_km:             parseNum(formData.get("odometer_km")),
    apk_expiry:              parseDate(formData.get("apk_expiry")),
    insurance_expiry:        parseDate(formData.get("insurance_expiry")),
    insurance_policy_number: parseDate(formData.get("insurance_policy_number")),
    road_tax_expiry:         parseDate(formData.get("road_tax_expiry")),
    last_service_date:       parseDate(formData.get("last_service_date")),
    last_service_km:         parseNum(formData.get("last_service_km")),
    service_interval_km:     parseNum(formData.get("service_interval_km")) ?? 15000,
    fuel_type:               parseDate(formData.get("fuel_type")),
    fuel_card_number:        parseDate(formData.get("fuel_card_number")),
    notes:                   parseDate(formData.get("notes")),
    is_active:               parseBool(formData.get("is_active")),
  };

  if (!values.nickname) {
    redirect("/admin/vehicles?error=nickname_required");
  }

  let vehicleId = id ?? "new";
  if (isNew) {
    vehicleId = await createVehicle(values as Parameters<typeof createVehicle>[0]);
  } else {
    await updateVehicle(id!, values);
  }

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: isNew ? "vehicle_created" : "vehicle_updated",
    payload: { vehicle_id: vehicleId, nickname: values.nickname },
  });

  revalidatePath("/admin/vehicles");
  redirect(`/admin/vehicles/${vehicleId}?saved=1`);
}

export async function deactivateVehicle(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string;
  await deleteVehicle(id);

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: "vehicle_deactivated",
    payload: { vehicle_id: id },
  });

  revalidatePath("/admin/vehicles");
  redirect("/admin/vehicles?deleted=1");
}
