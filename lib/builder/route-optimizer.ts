import type { LatLng } from "@/lib/builder/types";

export type StopWithCoords = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  duration_minutes: number;
};

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// meters at average city driving speed (25 km/h) → minutes
function haversineMinutes(a: LatLng, b: LatLng): number {
  return haversineMeters(a, b) / (25000 / 60);
}

/**
 * Nearest-neighbor TSP. Starts and ends at airport.
 *
 * durationMatrix[i][j] = travel-time in minutes from waypoint i to j,
 * where index 0 = airport and indices 1..n = stops.
 * Pass undefined to fall back to haversine estimates (used during
 * live selection preview before the Mapbox call completes).
 */
export function optimizeRoute(
  airport: LatLng,
  stops: StopWithCoords[],
  durationMatrix?: number[][],
): { orderedIndices: number[]; totalTravelMinutes: number } {
  if (stops.length === 0) return { orderedIndices: [], totalTravelMinutes: 0 };
  if (stops.length === 1) {
    const leg0 = durationMatrix
      ? durationMatrix[0][1]
      : haversineMinutes(airport, { lat: stops[0].latitude, lng: stops[0].longitude });
    const leg1 = durationMatrix
      ? durationMatrix[1][0]
      : leg0;
    return {
      orderedIndices: [0],
      totalTravelMinutes: Math.round(leg0 + leg1),
    };
  }

  const n = stops.length;
  const allCoords: LatLng[] = [
    airport,
    ...stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
  ];

  function dist(from: number, to: number): number {
    if (durationMatrix) return durationMatrix[from][to];
    return haversineMinutes(allCoords[from], allCoords[to]);
  }

  const visited = new Set<number>();
  const order: number[] = [];
  let current = 0;
  let total = 0;

  while (visited.size < n) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 1; i <= n; i++) {
      if (!visited.has(i)) {
        const d = dist(current, i);
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    if (best === -1) break;
    total += bestD;
    visited.add(best);
    order.push(best - 1); // 0-indexed into stops array
    current = best;
  }

  // Return leg
  total += dist(current, 0);

  return { orderedIndices: order, totalTravelMinutes: Math.round(total) };
}
