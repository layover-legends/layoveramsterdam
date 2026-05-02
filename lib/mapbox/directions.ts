import "server-only";
import { unstable_cache } from "next/cache";
import type { LatLng } from "@/lib/builder/types";

type Mode = "driving" | "walking" | "cycling";

function getToken(): string {
  return (
    process.env.MAPBOX_SERVER_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    ""
  );
}

function coordStr(coords: LatLng[]): string {
  return coords.map((c) => `${c.lng},${c.lat}`).join(";");
}

// Cached matrix fetcher — keyed by serialized coords + mode, TTL 1 h
const _fetchMatrix = unstable_cache(
  async (coordsJson: string, mode: Mode): Promise<number[][]> => {
    const token = getToken();
    const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/${mode}/${coordsJson}?sources=all&destinations=all&annotations=duration&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Mapbox Matrix API ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { durations: (number | null)[][] };
    // Convert seconds → minutes; treat null (no route) as large penalty (120 min)
    return data.durations.map((row) =>
      row.map((s) => (s === null ? 120 : Math.round(s / 60))),
    );
  },
  ["mapbox-matrix"],
  { revalidate: 3600 },
);

/**
 * Returns an n×n matrix of travel times in minutes.
 * Index order matches the input `coords` array.
 * Mapbox Matrix API limit: 25 coordinates per call.
 */
export async function getDurationMatrix(
  coords: LatLng[],
  mode: Mode,
): Promise<number[][]> {
  if (coords.length < 2) return [];
  const key = coordStr(coords);
  return _fetchMatrix(key, mode);
}

// Cached directions fetcher
const _fetchDirections = unstable_cache(
  async (
    coordsJson: string,
    mode: Mode,
  ): Promise<{
    geojson: GeoJSON.Feature<GeoJSON.LineString>;
    legs: Array<{ minutes: number; meters: number }>;
  }> => {
    const token = getToken();
    const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${coordsJson}?geometries=geojson&overview=full&steps=false&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Mapbox Directions API ${res.status}: ${await res.text()}`);
    }
    const data = await res.json() as {
      routes: Array<{
        geometry: GeoJSON.LineString;
        legs: Array<{ duration: number; distance: number }>;
      }>;
    };
    const route = data.routes[0];
    if (!route) throw new Error("No route returned by Mapbox Directions API");

    return {
      geojson: { type: "Feature", geometry: route.geometry, properties: {} },
      legs: route.legs.map((l) => ({
        minutes: Math.round(l.duration / 60),
        meters: Math.round(l.distance),
      })),
    };
  },
  ["mapbox-directions"],
  { revalidate: 3600 },
);

/**
 * Returns the full route geometry (LineString) + per-leg stats.
 * orderedCoords must be in visit order: airport → stop1 → stop2 → airport.
 */
export async function getRouteGeometry(
  orderedCoords: LatLng[],
  mode: Mode,
): Promise<{
  geojson: GeoJSON.Feature<GeoJSON.LineString>;
  legs: Array<{ minutes: number; meters: number }>;
}> {
  const key = coordStr(orderedCoords);
  return _fetchDirections(key, mode);
}
