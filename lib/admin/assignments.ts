import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AssignmentWithDetails = {
  id: string;
  booking_id: string | null;
  staff_id: string | null;
  vehicle_id: string | null;
  role_on_tour: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  preflight_done_at: string | null;
  preflight_checklist: Record<string, boolean> | null;
  started_at: string | null;
  completed_at: string | null;
  no_show_at: string | null;
  no_show_reason: string | null;
  odometer_start: number | null;
  odometer_end: number | null;
  fuel_cost_cents: number | null;
  guide_notes_on_customer: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  booking?: {
    id: string;
    party_size: number;
    total_cents: number;
    currency: string;
    status: string;
    customer_name: string | null;
    customer_email: string | null;
    cancellation_reason: string | null;
    tour?: { id: string; name: string; duration_hours: number | null } | null;
    user?: {
      id: string;
      full_name: string | null;
      email: string;
      phone: string | null;
      dietary_notes: string | null;
      accessibility_notes: string | null;
      is_vip: boolean;
      lifetime_bookings_count: number;
      lifetime_revenue_cents: number;
      internal_notes: string | null;
    } | null;
  } | null;
  staff?: { id: string; full_name: string; phone: string | null; preferred_name: string | null } | null;
  vehicle?: { id: string; nickname: string; license_plate: string | null } | null;
};

/** Fetch all assignments for a given date (YYYY-MM-DD) in Amsterdam time. */
export async function listAssignmentsForDate(date: string): Promise<AssignmentWithDetails[]> {
  const supabase = createClient();
  const startOfDay = `${date}T00:00:00+02:00`;
  const endOfDay   = `${date}T23:59:59+02:00`;

  const { data, error } = await supabase
    .from("assignments")
    .select(`
      *,
      booking:bookings(
        id, party_size, total_cents, currency, status, customer_name, customer_email, cancellation_reason,
        tour:tours(id, name, duration_hours),
        user:users(id, full_name, email, phone, dietary_notes, accessibility_notes, is_vip, lifetime_bookings_count, lifetime_revenue_cents, internal_notes)
      ),
      staff:staff(id, full_name, preferred_name, phone),
      vehicle:vehicles(id, nickname, license_plate)
    `)
    .gte("pickup_at", startOfDay)
    .lte("pickup_at", endOfDay)
    .order("pickup_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as AssignmentWithDetails[];
}

/** Fetch assignments for a staff member (driver view — today only). */
export async function listAssignmentsForStaff(
  staffId: string,
  date: string
): Promise<AssignmentWithDetails[]> {
  const supabase = createClient();
  const startOfDay = `${date}T00:00:00+02:00`;
  const endOfDay   = `${date}T23:59:59+02:00`;

  const { data, error } = await supabase
    .from("assignments")
    .select(`
      *,
      booking:bookings(
        id, party_size, total_cents, currency, status, customer_name, customer_email,
        tour:tours(id, name, duration_hours),
        user:users(id, full_name, email, phone, dietary_notes, accessibility_notes, is_vip, internal_notes)
      ),
      vehicle:vehicles(id, nickname, license_plate)
    `)
    .eq("staff_id", staffId)
    .gte("pickup_at", startOfDay)
    .lte("pickup_at", endOfDay)
    .order("pickup_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as AssignmentWithDetails[];
}

export async function getAssignmentById(id: string): Promise<AssignmentWithDetails | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select(`
      *,
      booking:bookings(
        id, party_size, total_cents, currency, status, customer_name, customer_email,
        tour:tours(id, name, duration_hours),
        user:users(id, full_name, email, phone, dietary_notes, accessibility_notes, is_vip, internal_notes)
      ),
      staff:staff(id, full_name, preferred_name, phone),
      vehicle:vehicles(id, nickname, license_plate)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as AssignmentWithDetails | null;
}

export async function createAssignment(values: {
  booking_id?: string;
  staff_id?: string;
  vehicle_id?: string;
  role_on_tour?: string;
  pickup_at?: string;
  dropoff_at?: string;
  internal_notes?: string;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assignments")
    .insert(values)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateAssignment(
  id: string,
  values: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("assignments")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
