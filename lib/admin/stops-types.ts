// Client-safe types for destinations (formerly free_stops).
// MUST NOT import server-only modules — used by "use client" components.

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Photo = {
  id: string;
  destination_id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean | null;
};

export type OpeningHour = {
  id: string;
  destination_id: string;
  day_of_week: number; // 0=Sun .. 6=Sat
  open_time: string | null;
  close_time: string | null;
};

export type Stop = {
  id: string;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  name: string;
  slug: string;
  area: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_adult_only: boolean | null;
  is_seasonal: boolean | null;
  requires_booking: boolean | null;
  wheelchair_accessible: boolean | null;
  primary_photo_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// Day-of-week labels for opening-hours editor (Monday-first to match EU convention).
export const DAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

// Visible filter chips on the admin list.
export const STOP_FILTERS = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "paid", label: "Bookable" },
  { key: "inactive", label: "Inactive" },
  { key: "seasonal", label: "Seasonal" },
  { key: "adult", label: "Adult only" },
] as const;
export type StopFilter = (typeof STOP_FILTERS)[number]["key"];
