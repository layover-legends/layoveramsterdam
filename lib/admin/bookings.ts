import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BookingRow } from "@/lib/admin/bookings-types";

export type BookingListResult = {
  rows: BookingRow[];
  totalMatching: number;
  pageSize: number;
  totalRevenueCents: number;
};

export async function listBookings({
  status,
  page = 1,
}: {
  status?: string;
  page?: number;
} = {}): Promise<BookingListResult> {
  const supabase = createClient();
  const pageSize = 40;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("bookings")
    .select("*, tours(name), users(email)", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  const rows: BookingRow[] = (data ?? []).map((r) => ({
    ...r,
    tour_name: (r.tours as { name?: string } | null)?.name ?? null,
    user_email: (r.users as { email?: string } | null)?.email ?? null,
  }));

  const totalRevenueCents = rows
    .filter((r) => !["cancelled", "refunded"].includes(r.status))
    .reduce((sum, r) => sum + r.total_cents, 0);

  return { rows, totalMatching: count ?? 0, pageSize, totalRevenueCents };
}

export async function getBooking(id: string): Promise<BookingRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, tours(name), users(email)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    tour_name: (data.tours as { name?: string } | null)?.name ?? null,
    user_email: (data.users as { email?: string } | null)?.email ?? null,
  };
}
