"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { autoTranslateEntity } from "@/lib/i18n/auto-translate";

type Kind = "destination" | "tour" | "article";

function isKind(v: unknown): v is Kind {
  return v === "destination" || v === "tour" || v === "article";
}

/**
 * Force re-translate a single entity into all non-EN locales.
 * Triggered by the "Re-translate" button on a punch-list row.
 *
 * Skips human-curated rows automatically (autoTranslateEntity respects
 * translated_by='human'). To force-overwrite human edits, pass an explicit
 * overwriteHuman=true via a different action (not exposed here for safety).
 */
export async function retranslateEntity(formData: FormData) {
  const admin = await requireAdmin();
  const kind = formData.get("kind");
  const id = (formData.get("id") || "").toString();
  if (!isKind(kind) || !id) {
    redirect("/admin/seo?error=" + encodeURIComponent("Invalid entity reference"));
  }

  let status = "ok";
  let detail = "";
  try {
    const r = await autoTranslateEntity(kind, id, {
      triggeredBy: admin.id,
      triggerSource: "admin_button",
    });
    if (!r.ok) {
      status = "partial";
      detail = r.errors.slice(0, 1).join("; ").slice(0, 100);
    } else if (r.written === 0 && r.skipped === 0) {
      status = "noop";
    }
  } catch (e) {
    status = "failed";
    detail = (e instanceof Error ? e.message : String(e)).slice(0, 100);
  }

  revalidatePath("/admin/seo");
  revalidatePath(`/admin/${kind}s/${id}`);
  redirect(
    `/admin/seo?retranslated=${kind}:${id}&status=${status}` +
      (detail ? `&detail=${encodeURIComponent(detail)}` : ""),
  );
}
