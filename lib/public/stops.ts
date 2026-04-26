import { createClient } from "@/lib/supabase/server";
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  type FreeStop,
  type FreeStopCategory,
} from "@/lib/admin/stops-types";

export type CategorySummary = {
  category: FreeStopCategory;
  label: string;
  emoji: string;
  count: number;
  examples: string[]; // up to 3 example stop names for this category
};

export type StopsTeaser = {
  totalCount: number;
  byCategory: CategorySummary[];
  featured: FreeStop[]; // a small curated sample for the hero grid
};

// Names we feature on the homepage. Picked from across categories so the
// preview tells the story: monuments, food, hidden gem, neighborhood, canal.
const FEATURED_NAMES = [
  "Dam Square",
  "Vondelpark",
  "Marché Albert Cuyp",
  "Begijnhof — La Cour Secrète",
  "Brouwersgracht",
  "Jordaan — Le Quartier Bohème",
  "GVB Ferry — Traversée IJ",
  "OBA — Rooftop Panoramique",
];

/**
 * Returns the data the public homepage shows about the free-stops catalog.
 * Read-only and goes through the existing "Public reads active stops" RLS
 * policy, so anyone (signed-in or not) can see this.
 *
 * Failure mode: if the table doesn't exist yet (e.g. migration not run on
 * a new environment), we return an empty teaser so the page still renders.
 */
export async function getStopsTeaser(): Promise<StopsTeaser> {
  const supabase = createClient();

  const [allRowsRes, featuredRes] = await Promise.all([
    supabase
      .from("free_stops")
      .select("name, category")
      .eq("is_active", true),
    supabase
      .from("free_stops")
      .select(
        "id, name, neighborhood, description, category, lat, lng, display_order, is_active, created_at, updated_at",
      )
      .eq("is_active", true)
      .in("name", FEATURED_NAMES),
  ]);

  if (allRowsRes.error || !allRowsRes.data) {
    return { totalCount: 0, byCategory: [], featured: [] };
  }

  const allRows = allRowsRes.data as Array<{ name: string; category: FreeStopCategory }>;
  const totalCount = allRows.length;

  // Tally per category and grab up to 3 example names per category.
  const tallies = new Map<FreeStopCategory, { count: number; examples: string[] }>();
  for (const cat of ALL_CATEGORIES) {
    tallies.set(cat, { count: 0, examples: [] });
  }
  for (const row of allRows) {
    const t = tallies.get(row.category);
    if (!t) continue;
    t.count += 1;
    if (t.examples.length < 3) t.examples.push(row.name);
  }

  const byCategory: CategorySummary[] = ALL_CATEGORIES
    .map((cat) => {
      const t = tallies.get(cat);
      const meta = CATEGORY_META[cat];
      return {
        category: cat,
        label: meta.label,
        emoji: meta.emoji,
        count: t?.count ?? 0,
        examples: t?.examples ?? [],
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const featured = (featuredRes.data ?? []) as FreeStop[];

  return { totalCount, byCategory, featured };
}
