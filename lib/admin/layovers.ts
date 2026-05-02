import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { LayoverRow } from "@/lib/admin/layovers-types";

export type LayoverListResult = {
  rows: LayoverRow[];
  totalMatching: number;
  pageSize: number;
};

export async function listLayovers({
  status,
  page = 1,
}: {
  status?: string;
  page?: number;
} = {}): Promise<LayoverListResult> {
  const supabase = createClient();
  const pageSize = 40;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("layovers")
    .select("*, users(email)", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  const rows: LayoverRow[] = (data ?? []).map((r) => ({
    ...r,
    user_email: (r.users as { email?: string } | null)?.email ?? null,
  }));

  return { rows, totalMatching: count ?? 0, pageSize };
}
