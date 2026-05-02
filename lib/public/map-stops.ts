import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MapStop = {
  id: string;
  name: string;
  area: string | null;
  slug: string;
  latitude: number;
  longitude: number;
};

export async function getMapStops(): Promise<MapStop[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("destinations")
      .select("id, name, area, slug, latitude, longitude")
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(300);

    if (error) return [];
    return (data ?? []) as MapStop[];
  } catch {
    return [];
  }
}
