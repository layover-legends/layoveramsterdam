import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side helper used by every page under /admin.
 *
 * - Redirects to /?auth_required=1 if the visitor is not signed in.
 * - Redirects to /?admin_only=1 if signed in but not an admin.
 * - Returns the admin's profile row when access is granted.
 *
 * Security: even if this helper is bypassed, the data queries underneath
 * still go through RLS (only admins can SELECT all rows), so a non-admin
 * who somehow reached an /admin route would still see an empty list.
 */
export async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth_required=1");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect("/?admin_only=1");
  }

  return {
    id: profile.id as string,
    email: profile.email as string,
    fullName: profile.full_name as string | null,
    avatarUrl: profile.avatar_url as string | null,
  };
}
