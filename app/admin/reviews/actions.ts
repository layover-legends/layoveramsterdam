"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { moderateReview, setOperatorResponse } from "@/lib/admin/reviews";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveReview(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string;
  await moderateReview(id, "approved");

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id, event_type: "review_approved", payload: { review_id: id },
  });
  revalidatePath("/admin/reviews");
}

export async function rejectReview(formData: FormData) {
  const admin = await requireAdmin();
  const id     = formData.get("id") as string;
  const reason = (formData.get("reason") as string | null)?.trim() || null;
  await moderateReview(id, "rejected", reason ?? undefined);

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id, event_type: "review_rejected", payload: { review_id: id, reason },
  });
  revalidatePath("/admin/reviews");
}

export async function markSpam(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string;
  await moderateReview(id, "spam");

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id, event_type: "review_spam", payload: { review_id: id },
  });
  revalidatePath("/admin/reviews");
}

export async function saveOperatorResponse(formData: FormData) {
  const admin = await requireAdmin();
  const id       = formData.get("id")       as string;
  const response = (formData.get("response") as string | null)?.trim() ?? "";

  if (!response) return;
  await setOperatorResponse(id, response);

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id, event_type: "review_operator_response", payload: { review_id: id },
  });
  revalidatePath("/admin/reviews");
}
