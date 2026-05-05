import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDurationMatrix, getRouteGeometry } from "@/lib/mapbox/directions";
import { optimizeRoute } from "@/lib/builder/route-optimizer";
import {
  SCHIPHOL_LAT,
  SCHIPHOL_LNG,
  DEFAULT_DURATION_MINUTES,
  type LatLng,
  type RouteLeg,
  type OptimizedRoute,
} from "@/lib/builder/types";

type RequestBody = {
  stop_ids: string[];
  layover_minutes: number;
  transport_mode?: "driving" | "walking" | "cycling";
};

type StopRow = {
  id: string;
  slug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  duration_minutes: number | null;
};

export async function POST(req: Request): Promise<NextResponse> {
  // Auth gate — anonymous callers would consume Mapbox API quota for free
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stop_ids, layover_minutes, transport_mode = "driving" } = body;

  if (!Array.isArray(stop_ids) || stop_ids.length === 0) {
    return NextResponse.json({ error: "stop_ids required" }, { status: 400 });
  }
  if (!layover_minutes || layover_minutes < 60) {
    return NextResponse.json({ error: "layover_minutes required (min 60)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("destinations")
    .select("id, slug, name, latitude, longitude, duration_minutes")
    .in("id", stop_ids)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const rows = (data ?? []) as StopRow[];
  const stops = rows
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      duration_minutes: r.duration_minutes ?? DEFAULT_DURATION_MINUTES,
    }));

  if (stops.length === 0) {
    return NextResponse.json({ error: "No stops with coordinates found" }, { status: 400 });
  }

  const airport: LatLng = { lat: SCHIPHOL_LAT, lng: SCHIPHOL_LNG };

  // Build coord array for Matrix API: [airport, ...stops]
  const allCoords: LatLng[] = [
    airport,
    ...stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
  ];

  // Get duration matrix (cached)
  let durationMatrix: number[][] | undefined;
  try {
    durationMatrix = await getDurationMatrix(allCoords, transport_mode);
  } catch (e) {
    console.error("[optimize] Matrix API failed, falling back to haversine:", e);
  }

  // Run nearest-neighbor optimizer
  const { orderedIndices, totalTravelMinutes } = optimizeRoute(
    airport,
    stops,
    durationMatrix,
  );

  const orderedStops = orderedIndices.map((i) => stops[i]);
  const totalVisitMinutes = orderedStops.reduce(
    (sum, s) => sum + s.duration_minutes,
    0,
  );

  // Build ordered coord array for Directions API
  const routeCoords: LatLng[] = [
    airport,
    ...orderedStops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
    airport, // return to airport
  ];

  let geometryResult: Awaited<ReturnType<typeof getRouteGeometry>> | null = null;
  try {
    geometryResult = await getRouteGeometry(routeCoords, transport_mode);
  } catch (e) {
    console.error("[optimize] Directions API failed, geometry will be null:", e);
  }

  // Build legs with from/to ids
  const legs: RouteLeg[] = orderedStops.map((stop, idx) => ({
    from_id: idx === 0 ? null : orderedStops[idx - 1].id,
    to_id: stop.id,
    minutes: geometryResult?.legs[idx]?.minutes ?? 0,
    meters: geometryResult?.legs[idx]?.meters ?? 0,
  }));

  const totalDistanceMeters = legs.reduce((sum, l) => sum + l.meters, 0);

  const result: OptimizedRoute = {
    orderedStopIds: orderedStops.map((s) => s.id),
    legs,
    totalTravelMinutes,
    totalVisitMinutes,
    totalDistanceMeters,
    geometry: geometryResult?.geojson ?? null,
  };

  return NextResponse.json(result);
}
