import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PartnerRow } from "@/lib/admin/partners-types";

export type PartnerListResult = {
  rows: PartnerRow[];
  totalMatching: number;
  pageSize: number;
};

export async function listPartners({
  status,
  page = 1,
}: {
  status?: string;
  page?: number;
} = {}): Promise<PartnerListResult> {
  const supabase = createClient();
  const pageSize = 40;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("partners")
    .select("*", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return { rows: (data ?? []) as PartnerRow[], totalMatching: count ?? 0, pageSize };
}
