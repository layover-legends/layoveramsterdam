import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StaffRow } from "@/lib/admin/staff-types";

export type StaffListResult = {
  rows: StaffRow[];
  totalMatching: number;
  pageSize: number;
};

export async function listStaff({
  role,
  page = 1,
}: {
  role?: string;
  page?: number;
} = {}): Promise<StaffListResult> {
  const supabase = createClient();
  const pageSize = 40;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("staff")
    .select("*, users(email)", { count: "exact" });

  if (role && role !== "all") {
    query = query.eq("role", role);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  const rows: StaffRow[] = (data ?? []).map((r) => ({
    ...r,
    user_email: (r.users as { email?: string } | null)?.email ?? null,
  }));

  return { rows, totalMatching: count ?? 0, pageSize };
}
