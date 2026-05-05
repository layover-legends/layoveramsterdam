"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffByUserId } from "@/lib/admin/staff";
import { updateAssignment } from "@/lib/admin/assignments";

/**
 * All driver mutations go through here.
 * Defence-in-depth: we check staff_id from the session even though
 * assignments_self_write RLS already guards the update.
 */
async function verifyStaffOwnsAssignment(assignmentId: string): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const staff = await getStaffByUserId(user.id);
  if (!staff) throw new Error("Not a staff member");

  const { data: a } = await supabase
    .from("assignments")
    .select("id, staff_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!a || a.staff_id !== staff.id) throw new Error("Assignment not found");
  return staff.id;
}

export async function markTourStarted(assignmentId: string, _staffId: string) {
  await verifyStaffOwnsAssignment(assignmentId);
  const now = new Date().toISOString();
  await updateAssignment(assignmentId, { started_at: now });
  redirect(`/driver/tour/${assignmentId}`);
}

export async function markTourCompleted(assignmentId: string, _staffId: string, formData: FormData) {
  await verifyStaffOwnsAssignment(assignmentId);
  const now = new Date().toISOString();
  const odomEnd  = formData.get("odometer_end") ? parseInt(formData.get("odometer_end") as string, 10) : null;
  const fuelEur  = formData.get("fuel_cost_euros") ? parseFloat(formData.get("fuel_cost_euros") as string) : null;

  await updateAssignment(assignmentId, {
    completed_at:    now,
    odometer_end:    isNaN(odomEnd as number) ? null : odomEnd,
    fuel_cost_cents: fuelEur !== null && !isNaN(fuelEur) ? Math.round(fuelEur * 100) : null,
  });
  redirect(`/driver/today`);
}

export async function savePreflightChecklist(assignmentId: string, _staffId: string, formData: FormData) {
  await verifyStaffOwnsAssignment(assignmentId);
  const now = new Date().toISOString();

  const ITEMS = [
    "vehicle_clean", "fuel_50", "apk_valid", "first_aid_kit",
    "customer_reviewed", "phone_charged", "water_bottles", "cash_float",
    "route_reviewed", "pickup_confirmed",
  ];
  const checklist: Record<string, boolean> = {};
  for (const item of ITEMS) {
    checklist[item] = formData.get(item) === "on";
  }

  const allDone = ITEMS.every((k) => checklist[k]);

  await updateAssignment(assignmentId, {
    preflight_checklist: checklist,
    preflight_done_at:   allDone ? now : null,
  });

  redirect(`/driver/tour/${assignmentId}`);
}

export async function markDriverNoShow(assignmentId: string, _staffId: string, formData: FormData) {
  await verifyStaffOwnsAssignment(assignmentId);
  const reason = (formData.get("reason") as string) || "other";
  const now    = new Date().toISOString();

  await updateAssignment(assignmentId, {
    no_show_at:    now,
    no_show_reason: reason,
  });

  // Audit log
  const admin = createAdminClient();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await admin.from("audit_logs").insert({
    user_id:    user?.id ?? null,
    event_type: "assignment_driver_no_show",
    payload:    { assignment_id: assignmentId, reason },
  });

  redirect("/driver/today");
}
