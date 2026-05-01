import { createClient } from "@/lib/supabase/server";
import type { Tour, TourFilter } from "@/lib/admin/tours-types";

export type { Tour, TourFilter } from "@/lib/admin/tours-types";
export { TOUR_FILTERS } from "@/lib/admin/tours-types";

const PAGE_SIZE = 25;

const TOUR_SELECT = `
  id, name, slug, tagline, description, duration_hours, price_cents, currency,
  max_group_size, is_active, requires_booking, is_adult_only, is_seasonal,
  meta_title, meta_description, created_at, updated_at,
  tour_stops ( id )
`;

type Row = {
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
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
  tour_stops: Array<{ id: string }> | null;
};

function rowToTour(r: Row): Tour {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    tagline: r.tagline,
    description: r.description,
    duration_hours: r.duration_hours !== null ? Number(r.duration_hours) : null,
    price_cents: r.price_cents,
    currency: r.currency,
    max_group_size: r.max_group_size,
    is_active: r.is_active,
    requires_booking: r.requires_booking,
    is_adult_only: r.is_adult_only,
    is_seasonal: r.is_seasonal,
    stop_count: (r.tour_stops ?? []).length,
    meta_title: r.meta_title,
    meta_description: r.meta_description,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export type ToursListResult = {
  rows: Tour[];
  totalMatching: number;
  page: number;
  pageSize: number;
  filterCounts: Record<TourFilter, number>;
};

export async function listTours({
  filter = "all",
  search = "",
  page = 1,
}: {
  filter?: TourFilter;
  search?: string;
  page?: number;
} = {}): Promise<ToursListResult> {
  const supabase = createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("tours")
    .select(TOUR_SELECT, { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (filter === "active") q = q.eq("is_active", true);
  if (filter === "inactive") q = q.eq("is_active", false);
  if (filter === "bookable") q = q.eq("requires_booking", true);
  if (filter === "free") q = q.eq("requires_booking", false);
  if (filter === "seasonal") q = q.eq("is_seasonal", true);
  if (filter === "adult") q = q.eq("is_adult_only", true);

  if (search.trim()) {
    const s = search.trim();
    q = q.or(`name.ilike.%${s}%,tagline.ilike.%${s}%,description.ilike.%${s}%`);
  }

  const { data, count } = await q;
  const rows = ((data ?? []) as unknown as Row[]).map(rowToTour);

  const [allC, activeC, inactiveC, bookableC, freeC, seasonalC, adultC] =
    await Promise.all([
      supabase.from("tours").select("id", { count: "exact", head: true }),
      supabase.from("tours").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("tours").select("id", { count: "exact", head: true }).eq("is_active", false),
      supabase.from("tours").select("id", { count: "exact", head: true }).eq("requires_booking", true),
      supabase.from("tours").select("id", { count: "exact", head: true }).eq("requires_booking", false),
      supabase.from("tours").select("id", { count: "exact", head: true }).eq("is_seasonal", true),
      supabase.from("tours").select("id", { count: "exact", head: true }).eq("is_adult_only", true),
    ]);

  const filterCounts: Record<TourFilter, number> = {
    all: allC.count ?? 0,
    active: activeC.count ?? 0,
    inactive: inactiveC.count ?? 0,
    bookable: bookableC.count ?? 0,
    free: freeC.count ?? 0,
    seasonal: seasonalC.count ?? 0,
    adult: adultC.count ?? 0,
  };

  return { rows, totalMatching: count ?? 0, page, pageSize: PAGE_SIZE, filterCounts };
}

export async function getTourById(id: string): Promise<Tour | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tours")
    .select(TOUR_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data ? rowToTour(data as unknown as Row) : null;
}
