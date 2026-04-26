import { createClient } from "@/lib/supabase/server";

export type FreeStopCategory =
  | "monuments"
  | "canals"
  | "neighborhoods"
  | "food"
  | "bars"
  | "architecture"
  | "experiences"
  | "hidden_gems"
  | "shopping"
  | "nature"
  | "religion";

export type FreeStop = {
  id: string;
  name: string;
  neighborhood: string | null;
  description: string | null;
  category: FreeStopCategory;
  lat: number | null;
  lng: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// Display label + tint for each category — used in the admin UI.
export const CATEGORY_META: Record<
  FreeStopCategory,
  { label: string; emoji: string }
> = {
  monuments: { label: "Monuments & Landmarks", emoji: "🏛️" },
  canals: { label: "Canaux & Scènes de rue", emoji: "🚤" },
  neighborhoods: { label: "Quartiers à explorer", emoji: "🏘️" },
  food: { label: "Food & Marchés", emoji: "🥯" },
  bars: { label: "Bars & Cafés", emoji: "🍻" },
  architecture: { label: "Architecture & Design", emoji: "📐" },
  experiences: { label: "Expériences & Transport", emoji: "⛴️" },
  hidden_gems: { label: "Pépites cachées", emoji: "💎" },
  shopping: { label: "Shopping local", emoji: "🛍️" },
  nature: { label: "Nature & Parcs", emoji: "🌳" },
  religion: { label: "Spiritualité & Religion", emoji: "⛪" },
};

export const ALL_CATEGORIES: FreeStopCategory[] = Object.keys(
  CATEGORY_META,
) as FreeStopCategory[];

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
