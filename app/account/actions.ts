"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateProfileUpdate } from "@/lib/validation/profile";
import { Resend } from "resend";
import {
  renderDeletionWarning,
  renderDeletionConfirmation,
} from "@/lib/email/templates/AccountDeletion";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

/**
 * Server Action: persist edits made on the /account form.
 * Auth-gated: redirects unauthenticated requests home.
 * Validation-gated: bad inputs come back with ?error=...
 * Success: row updated via RLS-enforced UPDATE, redirected to /account?saved=1
 */
export async function updateProfile(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth_required=1");
  }

  const result = validateProfileUpdate(formData);
  if (!result.ok) {
    redirect(`/account?error=${encodeURIComponent(result.error)}`);
  }

  const { error } = await supabase
    .from("users")
    .update(result.data)
    .eq("id", user.id);

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("Save failed: " + error.message)}`,
    );
  }

  revalidatePath("/account");
  redirect("/account?saved=1");
}

/**
 * Server Action: permanently delete the signed-in user's account (GDPR Art. 17).
 *
 * Steps:
 *  1. Send warning email
 *  2. Anonymise bookings (NL tax law — 7-year retention)
 *  3. Delete layovers, custom_routes, service_interest rows
 *  4. Log the deletion event to audit_logs
 *  5. Delete public.users row (cascades to most FKs)
 *  6. Delete auth.users via service-role admin client
 *  7. Send confirmation email (best-effort — user is gone but email is captured)
 *  8. Sign out + redirect home
 */
export async function deleteAccount(formData: FormData) {
  const confirmation = (formData.get("confirmation") as string | null)?.trim();
  if (confirmation !== "DELETE") {
    redirect("/account/delete?error=type_delete");
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?auth_required=1");
  }

  const uid = user.id;
  const email = user.email ?? "";

  // 1. Warning email (best-effort)
  try {
    const { subject, html } = renderDeletionWarning(email);
    await getResend().emails.send({
      from: "Layover Legends <no-reply@layover-legends.com>",
      to: email,
      subject,
      html,
    });
  } catch { /* non-fatal */ }

  const admin = createAdminClient();

  // 2. Anonymise bookings — keep for tax records, strip PII
  await admin
    .from("bookings")
    .update({
      user_id: null,
      customer_email: "deleted@anonymous.local",
      customer_name: "Deleted User",
    })
    .eq("user_id", uid);

  // 3. Delete other user-owned data
  await Promise.all([
    admin.from("layovers").delete().eq("user_id", uid),
    admin.from("custom_routes").delete().eq("user_id", uid),
    admin.from("service_interest").delete().eq("email", email),
  ]);

  // 4. Audit log — capture before deletion removes the FK reference
  await admin.from("audit_logs").insert({
    user_id: null, // uid is about to be deleted
    event_type: "account_deleted",
    payload: { email_hash: Buffer.from(email).toString("base64") },
  });

  // 5. Delete public.users row (cascade handles most child rows)
  await admin.from("users").delete().eq("id", uid);

  // 6. Delete auth.users via admin auth API
  await admin.auth.admin.deleteUser(uid);

  // 7. Confirmation email (best-effort — to email address, user row gone)
  try {
    const { subject, html } = renderDeletionConfirmation(email);
    await getResend().emails.send({
      from: "Layover Legends <no-reply@layover-legends.com>",
      to: email,
      subject,
      html,
    });
  } catch { /* non-fatal */ }

  // 8. Sign out + redirect home
  await supabase.auth.signOut();
  redirect("/?account_deleted=1");
}
