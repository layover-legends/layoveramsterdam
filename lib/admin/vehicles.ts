import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { VehicleRow } from "@/lib/admin/vehicles-types";

const PAGE_SIZE = 40;

export type VehicleListResult = {
  rows: VehicleRow[];
  totalMatching: number;
  pageSize: number;
};

export async function listVehicles({
  showInactive = false,
  page = 1,
}: { showInactive?: boolean; page?: number } = {}): Promise<VehicleListResult> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("vehicles")
    .select("*", { count: "exact" });

  if (!showInactive) query = query.eq("is_active", true);

  const { data, count, error } = await query
    .order("nickname", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw error;

  return {
    rows: (data ?? []).map((r) => ({
      ...r,
      service_interval_km: r.service_interval_km ?? 15000,
      is_active: r.is_active ?? true,
    })) as VehicleRow[],
    totalMatching: count ?? 0,
    pageSize: PAGE_SIZE,
  };
}

export async function getVehicleById(id: string): Promise<VehicleRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as VehicleRow | null;
}

export async function createVehicle(
  values: Omit<VehicleRow, "id" | "created_at" | "updated_at">
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .insert(values)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateVehicle(
  id: string,
  values: Partial<Omit<VehicleRow, "id" | "created_at">>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVehicle(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
