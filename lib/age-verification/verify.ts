"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const AGE_GATE_DAYS = 90; // re-verify every 90 days

/**
 * Returns true if the currently signed-in user has a valid adult consent
 * recorded within the last 90 days. Returns false if not signed in.
 */
export async function checkAdultConsent(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("users")
    .select("adult_consent_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!data?.adult_consent_at) return false;

  const consentAge =
    (Date.now() - new Date(data.adult_consent_at as string).getTime()) /
    (1000 * 60 * 60 * 24);

  return consentAge < AGE_GATE_DAYS;
}

/**
 * Server Action: record DOB + consent for the signed-in user.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function recordAdultConsent(
  dob: string, // "YYYY-MM-DD"
  ipAddress?: string,
  userAgent?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return { ok: false, error: "Invalid date format." };
  }

  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) {
    return { ok: false, error: "Invalid date." };
  }

  // Must be 18+
  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  if (dobDate > eighteenYearsAgo) {
    return { ok: false, error: "You must be 18 or older to access this content." };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const now = new Date().toISOString();
  const admin = createAdminClient();

  await Promise.all([
    admin
      .from("users")
      .update({ dob, adult_consent_at: now })
      .eq("id", user.id),

    admin.from("age_verification_logs").insert({
      user_id: user.id,
      dob,
      verified_at: now,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    }),
  ]);

  return { ok: true };
}
