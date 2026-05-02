// Client-safe types for the Tour Builder flow. No server-only imports.

export const SCHIPHOL_LNG = 4.7683;
export const SCHIPHOL_LAT = 52.3105;
export const AIRPORT_BUFFER_MINUTES = 90;
export const DEFAULT_DURATION_MINUTES = 60;
export const MAX_STOPS = 12;
export const MIN_LAYOVER_MINUTES = 180;  // 3 h
export const MAX_LAYOVER_MINUTES = 720;  // 12 h
export const LAYOVER_STEP_MINUTES = 30;

export type BuilderStop = {
  id: string;
  slug: string;
  name: string;
  area: string | null;
  category_id: string;
  category_name: string;
  requires_booking: boolean;
  is_adult_only: boolean;
  primary_photo_url: string | null;
  latitude: number;
  longitude: number;
  duration_minutes: number;
};

export type LatLng = { lat: number; lng: number };

export type RouteLeg = {
  from_id: string | null; // null = airport
  to_id: string;
  minutes: number;
  meters: number;
};

export type OptimizedRoute = {
  orderedStopIds: string[];
  legs: RouteLeg[];
  totalTravelMinutes: number;
  totalVisitMinutes: number;
  totalDistanceMeters: number;
  geometry: GeoJSON.Feature<GeoJSON.LineString> | null;
};

export type SavedRoute = {
  id: string;
  shareSlug: string;
};

export type StoredRoute = {
  id: string;
  cityId: string;
  layoverMinutes: number;
  airportBufferMinutes: number;
  transportMode: string;
  stopIds: string[];
  totalTravelMinutes: number | null;
  totalVisitMinutes: number | null;
  totalDistanceMeters: number | null;
  geometryJson: GeoJSON.Feature<GeoJSON.LineString> | null;
  legsJson: RouteLeg[] | null;
  isSaved: boolean;
  shareSlug: string | null;
  createdAt: string;
};
