import { createClient } from "@/lib/supabase/server";

export type CategorySummary = {
  category_id: string;
  name: string;
  slug: string;
  count: number;
  examples: string[];
};

export type FeaturedStop = {
  id: string;
  name: string;
  area: string | null;
  description: string | null;
  category_name: string | null;
  primary_photo_url: string | null;
};

export type StopsTeaser = {
  totalCount: number;
  byCategory: CategorySummary[];
  featured: FeaturedStop[];
};

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
 * Public-facing teaser: free destinations only (requires_booking = false)
 * with category breakdown + a curated featured set with images.
 *
 * Defensive: returns an empty teaser if the migration hasn't run yet,
 * so the homepage doesn't crash on a fresh environment.
 */
export async function getStopsTeaser(): Promise<StopsTeaser> {
  const supabase = createClient();

  const baseSelect = `
    id, name, area, description,
    destination_categories ( id, name, slug ),
    stop_photos ( url, is_primary )
  `;

  const [allRes, featuredRes] = await Promise.all([
    supabase
      .from("destinations")
      .select(baseSelect)
      .eq("is_active", true)
      .eq("requires_booking", false),
    supabase
      .from("destinations")
      .select(baseSelect)
      .eq("is_active", true)
      .eq("requires_booking", false)
      .in("name", FEATURED_NAMES),
  ]);

  if (allRes.error || !allRes.data) {
    return { totalCount: 0, byCategory: [], featured: [] };
  }

  type Row = {
    id: string;
    name: string;
    area: string | null;
    description: string | null;
    destination_categories: { id: string; name: string; slug: string } | null;
    stop_photos: Array<{ url: string; is_primary: boolean | null }> | null;
  };

  const allRows = allRes.data as unknown as Row[];
  const totalCount = allRows.length;

  const tally = new Map<
    string,
    { name: string; slug: string; count: number; examples: string[] }
  >();
  for (const row of allRows) {
    const c = row.destination_categories;
    if (!c) continue;
    const t = tally.get(c.id) ?? {
      name: c.name,
      slug: c.slug,
      count: 0,
      examples: [],
    };
    t.count += 1;
    if (t.examples.length < 3) t.examples.push(row.name);
    tally.set(c.id, t);
  }

  const byCategory: CategorySummary[] = [...tally.entries()]
    .map(([category_id, t]) => ({
      category_id,
      name: t.name,
      slug: t.slug,
      count: t.count,
      examples: t.examples,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const featured: FeaturedStop[] = ((featuredRes.data ?? []) as unknown as Row[]).map(
    (r) => {
      const photos = r.stop_photos ?? [];
      const url =
        photos.find((p) => p.is_primary)?.url ?? photos[0]?.url ?? null;
      return {
        id: r.id,
        name: r.name,
        area: r.area,
        description: r.description,
        category_name: r.destination_categories?.name ?? null,
        primary_photo_url: url,
      };
    },
  );

  return { totalCount, byCategory, featured };
}
