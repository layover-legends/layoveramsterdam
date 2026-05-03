"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateAssignment, createAssignment } from "@/lib/admin/assignments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffById } from "@/lib/admin/staff";
import { notifyStaffAssigned } from "@/lib/push/send";

export async function markAssignmentStarted(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("assignment_id") as string;
  const now = new Date().toISOString();

  await updateAssignment(id, { started_at: now });

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: "assignment_started",
    payload: { assignment_id: id },
  });

  revalidatePath("/admin/roster");
}

export async function markAssignmentCompleted(formData: FormData) {
  const admin = await requireAdmin();
  const id       = formData.get("assignment_id") as string;
  const odomEnd  = formData.get("odometer_end")  ? parseInt(formData.get("odometer_end") as string, 10) : null;
  const fuelCost = formData.get("fuel_cost_cents") ? parseInt(formData.get("fuel_cost_cents") as string, 10) : null;
  const now      = new Date().toISOString();

  await updateAssignment(id, {
    completed_at:    now,
    odometer_end:    odomEnd,
    fuel_cost_cents: fuelCost,
  });

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: "assignment_completed",
    payload: { assignment_id: id },
  });

  revalidatePath("/admin/roster");
}

export async function markAssignmentNoShow(formData: FormData) {
  const admin = await requireAdmin();
  const id     = formData.get("assignment_id") as string;
  const reason = (formData.get("reason") as string) || "other";
  const now    = new Date().toISOString();

  await updateAssignment(id, { no_show_at: now, no_show_reason: reason });

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: "assignment_no_show",
    payload: { assignment_id: id, reason },
  });

  revalidatePath("/admin/roster");
}

export async function assignStaffToBooking(formData: FormData) {
  const admin = await requireAdmin();
  const bookingId  = formData.get("booking_id")  as string;
  const staffId    = formData.get("staff_id")    as string;
  const vehicleId  = formData.get("vehicle_id")  as string | null;
  const pickupAt   = formData.get("pickup_at")   as string;
  const dropoffAt  = formData.get("dropoff_at")  as string | null;

  const assignmentId = await createAssignment({
    booking_id:  bookingId,
    staff_id:    staffId,
    vehicle_id:  vehicleId || undefined,
    role_on_tour: "driver_guide",
    pickup_at:   pickupAt,
    dropoff_at:  dropoffAt || undefined,
  });

  // Audit
  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id,
    event_type: "assignment_created",
    payload: { assignment_id: assignmentId, booking_id: bookingId, staff_id: staffId },
  });

  // Push notification to driver
  try {
    const staffRow = await getStaffById(staffId);
    if (staffRow?.user_id) {
      // Get tour name via the booking
      const adminCl = createAdminClient();
      const { data: bk } = await adminCl
        .from("bookings")
        .select("tours(name), scheduled_pickup_at")
        .eq("id", bookingId)
        .maybeSingle();
      const tourName = (bk as { tours?: { name?: string } } | null)?.tours?.name ?? "Tour";
      const pickup   = pickupAt;
      await notifyStaffAssigned(staffRow.user_id, tourName, pickup);
    }
  } catch { /* push is best-effort */ }

  revalidatePath("/admin/roster");
}
