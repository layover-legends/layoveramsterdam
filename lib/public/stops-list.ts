import "server-only";

import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadTranslations, tr } from "@/lib/i18n/translate";
import type { PublicStop, PublicCategory } from "@/lib/public/stops-list-types";

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  area: string | null;
  requires_booking: boolean;
  is_adult_only: boolean;
  latitude: number | null;
  longitude: number | null;
  destination_categories: { id: string; name: string; slug: string } | null;
  stop_photos: Array<{ url: string; is_primary: boolean | null }> | null;
};

export async function getPublicStops(): Promise<{
  stops: PublicStop[];
  categories: PublicCategory[];
}> {
  const supabase = createClient();
  const locale = resolveLocale();

  const { data, error } = await supabase
    .from("destinations")
    .select(`
      id, slug, name, description, area,
      requires_booking, is_adult_only, latitude, longitude,
      destination_categories ( id, name, slug ),
      stop_photos ( url, is_primary )
    `)
    .eq("is_active", true)
    .order("name");

  if (error || !data) {
    return { stops: [], categories: [] };
  }

  const rows = data as unknown as Row[];

  // Filter out rows with no category
  const validRows = rows.filter((r) => r.destination_categories !== null);

  // Load translations for all stops
  const bundle = await loadTranslations(
    validRows.map((r) => ({ entity_type: "destination", entity_id: r.id })),
    locale,
  );

  const stops: PublicStop[] = validRows.map((r) => {
    const ent = { entity_type: "destination", entity_id: r.id };
    const photos = r.stop_photos ?? [];
    const primaryUrl =
      photos.find((p) => p.is_primary)?.url ?? photos[0]?.url ?? null;

    return {
      id: r.id,
      slug: r.slug,
      name: tr(bundle, ent, "name", r.name),
      description: r.description
        ? tr(bundle, ent, "description", r.description)
        : null,
      area: r.area ?? null,
      category_id: r.destination_categories!.id,
      category_name: r.destination_categories!.name,
      requires_booking: r.requires_booking,
      is_adult_only: r.is_adult_only,
      primary_photo_url: primaryUrl,
      latitude: r.latitude !== null ? Number(r.latitude) : null,
      longitude: r.longitude !== null ? Number(r.longitude) : null,
    };
  });

  // Build unique categories map sorted by name
  const categoryMap = new Map<string, PublicCategory>();
  for (const row of validRows) {
    const c = row.destination_categories!;
    if (!categoryMap.has(c.id)) {
      categoryMap.set(c.id, { id: c.id, name: c.name, slug: c.slug });
    }
  }
  const categories: PublicCategory[] = [...categoryMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { stops, categories };
}
