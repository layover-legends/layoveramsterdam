import { createClient } from "@/lib/supabase/server";
import type { TourStopRow, AddableDestination } from "@/lib/admin/tour-stops-types";

export type { TourStopRow, AddableDestination } from "@/lib/admin/tour-stops-types";

type RawRow = {
  id: string;
  tour_id: string;
  destination_id: string;
  stop_order: number;
  is_optional: boolean | null;
  duration_override: number | null;
  notes: string | null;
  destinations: {
    id: string;
    name: string;
    slug: string;
    area: string | null;
    destination_categories: { slug: string } | null;
    stop_photos: Array<{ url: string; is_primary: boolean | null }> | null;
  } | null;
};

export async function getTourStops(tourId: string): Promise<TourStopRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tour_stops")
    .select(`
      id, tour_id, destination_id, stop_order, is_optional, duration_override, notes,
      destinations (
        id, name, slug, area,
        destination_categories ( slug ),
        stop_photos ( url, is_primary )
      )
    `)
    .eq("tour_id", tourId)
    .order("stop_order", { ascending: true });

  return ((data ?? []) as unknown as RawRow[]).map((r) => {
    const d = r.destinations!;
    const photos = d.stop_photos ?? [];
    const primary = photos.find((p) => p.is_primary)?.url ?? photos[0]?.url ?? null;
    return {
      id: r.id,
      tour_id: r.tour_id,
      destination_id: r.destination_id,
      stop_order: r.stop_order,
      is_optional: r.is_optional ?? false,
      duration_override: r.duration_override,
      notes: r.notes,
      destination: {
        id: d.id,
        name: d.name,
        slug: d.slug,
        area: d.area,
        category_slug: d.destination_categories?.slug ?? null,
        primary_photo_url: primary,
      },
    };
  });
}

type RawDest = {
  id: string;
  name: string;
  area: string | null;
  destination_categories: { slug: string } | null;
};

export async function searchAddableDestinations(
  tourId: string,
  q: string,
): Promise<AddableDestination[]> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("tour_stops")
    .select("destination_id")
    .eq("tour_id", tourId);

  const excludeIds = (existing ?? []).map((r) => r.destination_id);

  let query = supabase
    .from("destinations")
    .select("id, name, area, destination_categories ( slug )")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(20);

  if (q.trim()) {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data } = await query;
  return ((data ?? []) as unknown as RawDest[]).map((d) => ({
    id: d.id,
    name: d.name,
    area: d.area,
    category_slug: d.destination_categories?.slug ?? null,
  }));
}
