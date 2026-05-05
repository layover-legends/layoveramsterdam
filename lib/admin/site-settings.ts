import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SiteSettings = Record<string, string | null>;

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value");
  const result: SiteSettings = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    result[row.key] = row.value;
  }
  return result;
}

export async function getSetting(key: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data as { value: string | null } | null)?.value ?? null;
}

export async function upsertSetting(
  key: string,
  value: string | null,
  updatedByUserId: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("site_settings").upsert(
    { key, value, updated_at: new Date().toISOString(), updated_by_user_id: updatedByUserId },
    { onConflict: "key" }
  );
}

export async function upsertSettings(
  entries: Record<string, string | null>,
  updatedByUserId: string
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const rows = Object.entries(entries).map(([key, value]) => ({
    key, value, updated_at: now, updated_by_user_id: updatedByUserId,
  }));
  await admin.from("site_settings").upsert(rows, { onConflict: "key" });
}
