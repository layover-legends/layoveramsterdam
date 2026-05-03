import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StaffRow } from "@/lib/admin/staff-types";

const PAGE_SIZE = 40;

export type StaffListResult = {
  rows: StaffRow[];
  totalMatching: number;
  pageSize: number;
};

const STAFF_FIELDS = "*";

export async function listStaff({
  role,
  showInactive = false,
  page = 1,
}: {
  role?: string;
  showInactive?: boolean;
  page?: number;
} = {}): Promise<StaffListResult> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("staff")
    .select(`${STAFF_FIELDS}, users(email)`, { count: "exact" });

  if (role && role !== "all") query = query.eq("role", role);
  if (!showInactive) query = query.eq("is_active", true);

  const { data, count, error } = await query
    .order("full_name", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw error;

  const rows: StaffRow[] = (data ?? []).map((r) => {
    const row = r as unknown as StaffRow & { users?: { email?: string } | null };
    return {
      ...row,
      full_name: row.full_name ?? "",
      spoken_languages: row.spoken_languages ?? [],
      is_active: row.is_active ?? true,
      max_tours_per_day: row.max_tours_per_day ?? 3,
      user_email: row.users?.email ?? null,
    } as StaffRow;
  });

  return { rows, totalMatching: count ?? 0, pageSize: PAGE_SIZE };
}

export async function getStaffById(id: string): Promise<StaffRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(`${STAFF_FIELDS}, bio_long, users(email)`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { users, ...rest } = data as typeof data & { users: { email?: string } | null };
  return {
    ...rest,
    full_name: rest.full_name ?? "",
    spoken_languages: rest.spoken_languages ?? [],
    is_active: rest.is_active ?? true,
    max_tours_per_day: rest.max_tours_per_day ?? 3,
    user_email: users?.email ?? null,
  } as StaffRow;
}

export async function getStaffByUserId(userId: string): Promise<StaffRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(`${STAFF_FIELDS}, bio_long`)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    full_name: data.full_name ?? "",
    spoken_languages: (data.spoken_languages as string[]) ?? [],
    is_active: (data.is_active as boolean) ?? true,
    max_tours_per_day: (data.max_tours_per_day as number) ?? 3,
  } as StaffRow;
}

export async function createStaff(
  values: Omit<StaffRow, "id" | "created_at" | "updated_at" | "user_email">
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("staff")
    .insert(values)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateStaff(
  id: string,
  values: Partial<Omit<StaffRow, "id" | "created_at" | "user_email">>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("staff")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteStaff(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("staff")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
