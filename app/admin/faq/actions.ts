"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { upsertFaqEntry, deleteFaqEntry } from "@/lib/admin/faq";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveFaqEntry(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string | null;

  const values = {
    id:         id || undefined,
    category:   (formData.get("category") as string) || "other",
    sort_order: parseInt(formData.get("sort_order") as string || "100", 10),
    is_active:  formData.get("is_active") !== "false",
    question:   ((formData.get("question") as string) || "").trim(),
    answer:     ((formData.get("answer")   as string) || "").trim(),
    source_lang: "en",
  };

  if (!values.question || !values.answer) {
    redirect("/admin/faq?error=required_fields");
  }

  const entryId = await upsertFaqEntry(values as Parameters<typeof upsertFaqEntry>[0]);

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id:    admin.id,
    event_type: id ? "faq_updated" : "faq_created",
    payload:    { faq_id: entryId, question: values.question.slice(0, 100) },
  });

  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  redirect(`/admin/faq?saved=1`);
}

export async function toggleFaqActive(formData: FormData) {
  const admin = await requireAdmin();
  const id      = formData.get("id") as string;
  const current = formData.get("is_active") === "true";

  const auditAdmin = createAdminClient();
  await auditAdmin.from("faq_entries")
    .update({ is_active: !current, updated_at: new Date().toISOString() })
    .eq("id", id);

  await auditAdmin.from("audit_logs").insert({
    user_id:    admin.id,
    event_type: "faq_toggled",
    payload:    { faq_id: id, is_active: !current },
  });

  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}

export async function hardDeleteFaq(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id") as string;
  await deleteFaqEntry(id);

  const auditAdmin = createAdminClient();
  await auditAdmin.from("audit_logs").insert({
    user_id: admin.id, event_type: "faq_deleted", payload: { faq_id: id },
  });

  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  redirect("/admin/faq?deleted=1");
}
