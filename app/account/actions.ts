"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileUpdate } from "@/lib/validation/profile";

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
