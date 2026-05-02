// Client-safe types — no server imports.

export type PublicStop = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  area: string | null;
  category_id: string;
  category_name: string;
  requires_booking: boolean;
  is_adult_only: boolean;
  primary_photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
};
