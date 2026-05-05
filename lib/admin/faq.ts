import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FaqRow } from "@/lib/admin/faq-types";

export async function listFaq({
  category,
  showInactive = false,
  page = 1,
}: {
  category?: string;
  showInactive?: boolean;
  page?: number;
} = {}): Promise<{ rows: FaqRow[]; totalMatching: number; pageSize: number }> {
  const pageSize = 50;
  const supabase = createClient();
  let q = supabase.from("faq_entries").select("*", { count: "exact" });
  if (category && category !== "all") q = q.eq("category", category);
  if (!showInactive) q = q.eq("is_active", true);

  const { data, count, error } = await q
    .order("category")
    .order("sort_order")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw error;
  return { rows: (data ?? []) as FaqRow[], totalMatching: count ?? 0, pageSize };
}

export async function getFaqById(id: string): Promise<FaqRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("faq_entries").select("*").eq("id", id).maybeSingle();
  return (data as FaqRow | null);
}

export async function getAllActiveFaqs(): Promise<FaqRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("faq_entries")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");
  return (data ?? []) as FaqRow[];
}

export async function upsertFaqEntry(
  values: Omit<FaqRow, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<string> {
  const admin = createAdminClient();
  if (values.id) {
    await admin.from("faq_entries")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", values.id);
    return values.id;
  }
  const { data, error } = await admin.from("faq_entries")
    .insert(values).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteFaqEntry(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("faq_entries")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
}
