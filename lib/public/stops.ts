import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadTranslations, tr } from "@/lib/i18n/translate";

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

// Stable identifiers — slugs survive source-language flips. Update this list
// to curate which stops appear in the homepage featured grid. Eight slots,
// pick whatever mix makes sense.
const FEATURED_SLUGS = [
  "dam-square",
  "vondelpark",
  "albert-cuyp-market",
  "begijnhof",
  "brouwersgracht",
  "jordaan",
  "gvb-ferry",
  "oba-rooftop",
];

/**
 * Public-facing teaser: free destinations only (requires_booking=false,
 * is_adult_only=false) with category breakdown + a curated featured set.
 *
 * Translates name/area/description into the active locale via the
 * translations table. Falls back to source values if no translation exists.
 *
 * Defensive: returns an empty teaser if the migration hasn't run yet,
 * so the homepage doesn't crash on a fresh environment.
 */
export async function getStopsTeaser(): Promise<StopsTeaser> {
  const supabase = createClient();
  const locale = resolveLocale();

  const baseSelect = `
    id, slug, name, area, description,
    destination_categories ( id, name, slug ),
    stop_photos ( url, is_primary )
  `;

  const [allRes, featuredRes] = await Promise.all([
    supabase
      .from("destinations")
      .select(baseSelect)
      .eq("is_active", true)
      .eq("requires_booking", false)
      .eq("is_adult_only", false),
    supabase
      .from("destinations")
      .select(baseSelect)
      .eq("is_active", true)
      .eq("requires_booking", false)
      .eq("is_adult_only", false)
      .in("slug", FEATURED_SLUGS),
  ]);

  if (allRes.error || !allRes.data) {
    return { totalCount: 0, byCategory: [], featured: [] };
  }

  type Row = {
    id: string;
    slug: string;
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

  const featuredRaw = (featuredRes.data ?? []) as unknown as Row[];

  // Load translations for the active locale for these featured rows.
  const bundle = await loadTranslations(
    featuredRaw.map((r) => ({ entity_type: "destination", entity_id: r.id })),
    locale,
  );

  // Re-order to match FEATURED_SLUGS so the homepage card grid stays in the
  // curated order regardless of DB return order.
  const orderIndex = new Map<string, number>(
    FEATURED_SLUGS.map((slug, i) => [slug, i]),
  );
  featuredRaw.sort(
    (a, b) =>
      (orderIndex.get(a.slug) ?? 99) - (orderIndex.get(b.slug) ?? 99),
  );

  const featured: FeaturedStop[] = featuredRaw.map((r) => {
    const photos = r.stop_photos ?? [];
    const url =
      photos.find((p) => p.is_primary)?.url ?? photos[0]?.url ?? null;
    const ent = { entity_type: "destination", entity_id: r.id };
    return {
      id: r.id,
      name: tr(bundle, ent, "name", r.name),
      area: r.area ? tr(bundle, ent, "area", r.area) : null,
      description: r.description
        ? tr(bundle, ent, "description", r.description)
        : null,
      category_name: r.destination_categories?.name ?? null,
      primary_photo_url: url,
    };
  });

  return { totalCount, byCategory, featured };
}
