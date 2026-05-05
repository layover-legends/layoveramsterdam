import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStaffByUserId } from "@/lib/admin/staff";
import { listAssignmentsForStaff } from "@/lib/admin/assignments";

/**
 * GET /api/driver/today
 * Returns today's assignments for the authenticated driver.
 * Cached by the service worker with network-first + 4h fallback.
 */
export async function GET(_req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const staff = await getStaffByUserId(user.id);
  if (!staff) {
    return new Response(JSON.stringify({ error: "Not a staff member" }), { status: 403 });
  }

  // Amsterdam date
  const now = new Date();
  now.setHours(now.getHours() + 2);
  const today = now.toISOString().slice(0, 10);

  const assignments = await listAssignmentsForStaff(staff.id, today);

  return new Response(JSON.stringify({
    date:        today,
    staff_id:    staff.id,
    staff_name:  staff.preferred_name || staff.full_name,
    assignments,
    synced_at:   new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store", // SW handles caching
    },
  });
}
