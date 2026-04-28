import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  Photo,
  OpeningHour,
  Stop,
  StopFilter,
} from "@/lib/admin/stops-types";

export type {
  Category,
  Photo,
  OpeningHour,
  Stop,
  StopFilter,
} from "@/lib/admin/stops-types";
export { DAY_LABELS, STOP_FILTERS } from "@/lib/admin/stops-types";

const PAGE_SIZE = 50;

const STOP_SELECT = `
  id, category_id, name, slug, area, description, latitude, longitude,
  is_active, is_adult_only, is_seasonal, requires_booking, wheelchair_accessible,
  created_at, updated_at,
  destination_categories ( name, slug ),
  stop_photos ( url, is_primary )
`;

type Row = {
  id: string;
  category_id: string | null;
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
  created_at: string | null;
  updated_at: string | null;
  destination_categories: { name: string; slug: string } | null;
  stop_photos: Array<{ url: string; is_primary: boolean | null }> | null;
};

function rowToStop(r: Row): Stop {
  // Choose the primary photo, fall back to the first one.
  const photos = r.stop_photos ?? [];
  const primary = photos.find((p) => p.is_primary)?.url ?? photos[0]?.url ?? null;
  return {
    id: r.id,
    category_id: r.category_id,
    category_slug: r.destination_categories?.slug ?? null,
    category_name: r.destination_categories?.name ?? null,
    name: r.name,
    slug: r.slug,
    area: r.area,
    description: r.description,
    latitude: r.latitude !== null ? Number(r.latitude) : null,
    longitude: r.longitude !== null ? Number(r.longitude) : null,
    is_active: r.is_active,
    is_adult_only: r.is_adult_only,
    is_seasonal: r.is_seasonal,
    requires_booking: r.requires_booking,
    wheelchair_accessible: r.wheelchair_accessible,
    primary_photo_url: primary,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export type StopsListResult = {
  rows: Stop[];
  totalMatching: number;
  page: number;
  pageSize: number;
  filterCounts: Record<StopFilter, number>;
  categoriesByCount: Array<{ category: Category; count: number }>;
};

export async function listStops({
  filter = "all",
  categorySlug,
  search = "",
  page = 1,
}: {
  filter?: StopFilter;
  categorySlug?: string;
  search?: string;
  page?: number;
}): Promise<StopsListResult> {
  const supabase = createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("destinations")
    .select(STOP_SELECT, { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  // Filter by primary flag.
  if (filter === "free") q = q.eq("requires_booking", false);
  if (filter === "paid") q = q.eq("requires_booking", true);
  if (filter === "inactive") q = q.eq("is_active", false);
  if (filter === "seasonal") q = q.eq("is_seasonal", true);
  if (filter === "adult") q = q.eq("is_adult_only", true);

  if (categorySlug) {
    // PostgREST nested filter: filter by joined table column.
    q = q.eq("destination_categories.slug", categorySlug);
  }
  if (search.trim()) {
    const s = search.trim();
    q = q.or(`name.ilike.%${s}%,area.ilike.%${s}%,description.ilike.%${s}%`);
  }

  const { data, count } = await q;
  const rows = ((data ?? []) as unknown as Row[]).map(rowToStop);

  // Filter counts (compact extra queries).
  const [allCount, freeCount, paidCount, inactiveCount, seasonalCount, adultCount, catData] =
    await Promise.all([
      supabase.from("destinations").select("id", { count: "exact", head: true }),
      supabase.from("destinations").select("id", { count: "exact", head: true }).eq("requires_booking", false),
      supabase.from("destinations").select("id", { count: "exact", head: true }).eq("requires_booking", true),
      supabase.from("destinations").select("id", { count: "exact", head: true }).eq("is_active", false),
      supabase.from("destinations").select("id", { count: "exact", head: true }).eq("is_seasonal", true),
      supabase.from("destinations").select("id", { count: "exact", head: true }).eq("is_adult_only", true),
      supabase
        .from("destinations")
        .select("category_id, destination_categories ( id, name, slug )"),
    ]);

  const filterCounts: Record<StopFilter, number> = {
    all: allCount.count ?? 0,
    free: freeCount.count ?? 0,
    paid: paidCount.count ?? 0,
    inactive: inactiveCount.count ?? 0,
    seasonal: seasonalCount.count ?? 0,
    adult: adultCount.count ?? 0,
  };

  // Build per-category counts.
  type CatRow = { category_id: string | null; destination_categories: Category | null };
  const tally = new Map<string, { category: Category; count: number }>();
  ((catData.data ?? []) as unknown as CatRow[]).forEach((r) => {
    const c = r.destination_categories;
    if (!c) return;
    const existing = tally.get(c.id);
    if (existing) existing.count += 1;
    else tally.set(c.id, { category: c, count: 1 });
  });
  const categoriesByCount = [...tally.values()].sort((a, b) => b.count - a.count);

  return {
    rows,
    totalMatching: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    filterCounts,
    categoriesByCount,
  };
}

export async function getStopById(id: string): Promise<Stop | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("destinations")
    .select(STOP_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data ? rowToStop(data as unknown as Row) : null;
}

export async function listCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("destination_categories")
    .select("id, name, slug")
    .order("name", { ascending: true });
  return (data ?? []) as Category[];
}

export async function listPhotosFor(destinationId: string): Promise<Photo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("stop_photos")
    .select("id, destination_id, url, alt_text, is_primary")
    .eq("destination_id", destinationId)
    .order("is_primary", { ascending: false })
    .order("id", { ascending: true });
  return (data ?? []) as Photo[];
}

export async function listOpeningHoursFor(destinationId: string): Promise<OpeningHour[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("stop_opening_hours")
    .select("id, destination_id, day_of_week, open_time, close_time")
    .eq("destination_id", destinationId)
    .order("day_of_week", { ascending: true });
  return (data ?? []) as OpeningHour[];
}
