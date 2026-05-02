"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RouteLeg } from "@/lib/builder/types";

type SaveRouteParams = {
  cityId: string;
  layoverMinutes: number;
  stopIds: string[];
  totalTravelMinutes: number;
  totalVisitMinutes: number;
  totalDistanceMeters: number;
  geometryJson: GeoJSON.Feature<GeoJSON.LineString> | null;
  legsJson: RouteLeg[];
  transportMode?: string;
};

type SaveRouteResult = {
  id: string;
  shareSlug: string;
};

function generateSlug(): string {
  // 8 random hex chars — ~4 billion combinations, negligible collision risk at launch scale
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function saveRoute(
  params: SaveRouteParams,
): Promise<SaveRouteResult> {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();

  const shareSlug = generateSlug();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_routes")
    .insert({
      city_id: params.cityId,
      user_id: user?.id ?? null,
      share_slug: shareSlug,
      layover_minutes: params.layoverMinutes,
      stop_ids: params.stopIds,
      total_travel_minutes: params.totalTravelMinutes,
      total_visit_minutes: params.totalVisitMinutes,
      total_distance_meters: params.totalDistanceMeters,
      geometry_json: params.geometryJson,
      legs_json: params.legsJson,
      transport_mode: params.transportMode ?? "driving",
      is_saved: true,
    })
    .select("id, share_slug")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save route: ${error?.message}`);
  }

  return { id: data.id as string, shareSlug: data.share_slug as string };
}
