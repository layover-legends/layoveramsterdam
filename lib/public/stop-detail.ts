import { createClient } from "@/lib/supabase/server";

export type StopDetail = {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  description: string | null;
  category_name: string | null;
  primary_photo_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  requires_booking: boolean | null;
  is_adult_only: boolean | null;
  latitude: number | null;
  longitude: number | null;
};

type Row = {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  requires_booking: boolean | null;
  is_adult_only: boolean | null;
  latitude: number | null;
  longitude: number | null;
  destination_categories: { name: string } | null;
  stop_photos: Array<{ url: string; is_primary: boolean | null }> | null;
};

export async function getStopBySlug(slug: string): Promise<StopDetail | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("destinations")
    .select(`
      id, name, slug, area, description, meta_title, meta_description,
      requires_booking, is_adult_only, latitude, longitude,
      destination_categories ( name ),
      stop_photos ( url, is_primary )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  const r = data as unknown as Row;
  const photos = r.stop_photos ?? [];
  const primary = photos.find((p) => p.is_primary)?.url ?? photos[0]?.url ?? null;

  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    area: r.area,
    description: r.description,
    category_name: r.destination_categories?.name ?? null,
    primary_photo_url: primary,
    meta_title: r.meta_title,
    meta_description: r.meta_description,
    requires_booking: r.requires_booking,
    is_adult_only: r.is_adult_only,
    latitude: r.latitude !== null ? Number(r.latitude) : null,
    longitude: r.longitude !== null ? Number(r.longitude) : null,
  };
}
