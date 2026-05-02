import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getDefaultCityId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("cities")
      .select("id")
      .eq("slug", "amsterdam")
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}
