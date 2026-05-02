import "server-only";

import { createClient } from "@/lib/supabase/server";

export type HomepageStats = {
  completedBookings: number;
};

export async function getHomepageStats(): Promise<HomepageStats> {
  try {
    const supabase = createClient();
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed");
    return { completedBookings: count ?? 0 };
  } catch {
    return { completedBookings: 0 };
  }
}
