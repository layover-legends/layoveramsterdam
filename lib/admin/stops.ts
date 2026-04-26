import { createClient } from "@/lib/supabase/server";
import type { FreeStop, FreeStopCategory } from "@/lib/admin/stops-types";

// Re-export the client-safe types/constants so existing callers keep working.
export type { FreeStop, FreeStopCategory } from "@/lib/admin/stops-types";
export { CATEGORY_META, ALL_CATEGORIES } from "@/lib/admin/stops-types";

export type StopsListResult = {
  rows: FreeStop[];
  totalMatching: number;
  page: number;
  pageSize: number;
  countsByCategory: Record<FreeStopCategory | "_all", number>;
};

const PAGE_SIZE = 50;

export async function listFreeStops({
  category,
  search = "",
  page = 1,
}: {
  category?: FreeStopCategory;
  search?: string;
  page?: number;
}): Promise<StopsListResult> {
  const supabase = createClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("free_stops")
    .select(
      "id, name, neighborhood, description, category, lat, lng, display_order, is_active, created_at, updated_at",
      { count: "exact" },
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .range(from, to);

  if (category) q = q.eq("category", category);
  if (search.trim()) {
    const s = search.trim();
    q = q.or(
      `name.ilike.%${s}%,neighborhood.ilike.%${s}%,description.ilike.%${s}%`,
    );
  }

  const { data, count } = await q;

  // Counts per category for the filter chips. One small extra round-trip,
  // worth it for the always-visible chip badges.
  const { data: tallyRows } = await supabase
    .from("free_stops")
    .select("category");

  const countsByCategory: Record<FreeStopCategory | "_all", number> = {
    _all: 0,
    monuments: 0,
    canals: 0,
    neighborhoods: 0,
    food: 0,
    bars: 0,
    architecture: 0,
    experiences: 0,
    hidden_gems: 0,
    shopping: 0,
    nature: 0,
    religion: 0,
  };
  (tallyRows ?? []).forEach((r) => {
    const c = r.category as FreeStopCategory;
    countsByCategory._all += 1;
    if (c in countsByCategory) countsByCategory[c] += 1;
  });

  return {
    rows: (data ?? []) as FreeStop[],
    totalMatching: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    countsByCategory,
  };
}
