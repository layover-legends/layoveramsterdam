// Client-safe types for the tour-stops editor.
// MUST NOT import server-only modules.

export type TourStopRow = {
  id: string;
  tour_id: string;
  destination_id: string;
  stop_order: number;
  is_optional: boolean;
  duration_override: number | null;
  notes: string | null;
  destination: {
    id: string;
    name: string;
    slug: string;
    area: string | null;
    category_slug: string | null;
    primary_photo_url: string | null;
  };
};

export type AddableDestination = {
  id: string;
  name: string;
  area: string | null;
  category_slug: string | null;
};
