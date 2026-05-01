// Client-safe types for tours.
// MUST NOT import server-only modules — used by "use client" components.

export type Tour = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  duration_hours: number | null;
  price_cents: number | null;
  currency: string;
  max_group_size: number | null;
  is_active: boolean;
  requires_booking: boolean;
  is_adult_only: boolean;
  is_seasonal: boolean;
  stop_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export const TOUR_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "bookable", label: "Bookable" },
  { key: "free", label: "Free" },
  { key: "seasonal", label: "Seasonal" },
  { key: "adult", label: "Adult only" },
] as const;

export type TourFilter = (typeof TOUR_FILTERS)[number]["key"];
