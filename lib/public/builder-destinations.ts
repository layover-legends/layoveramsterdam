import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadTranslations, tr } from "@/lib/i18n/translate";
import { DEFAULT_DURATION_MINUTES } from "@/lib/builder/types";
import type { BuilderStop } from "@/lib/builder/types";
import type { PublicCategory } from "@/lib/public/stops-list-types";

type Row = {
  id: string;
  slug: string;
  name: string;
  area: string | null;
  category_id: string | null;
  requires_booking: boolean;
  is_adult_only: boolean;
  latitude: number | null;
  longitude: number | null;
  duration_minutes: number | null;
  primary_photo_url: string | null;
  destination_categories: { id: string; name: string; slug: string } | null;
  stop_photos: Array<{ url: string; is_primary: boolean | null }> | null;
};

export async function getBuilderDestinations(): Promise<{
  stops: BuilderStop[];
  categories: PublicCategory[];
}> {
  const supabase = createClient();
  const locale = resolveLocale();

  const { data, error } = await supabase
    .from("destinations")
    .select(`
      id, slug, name, area, requires_booking, is_adult_only,
      latitude, longitude, duration_minutes,
      destination_categories ( id, name, slug ),
      stop_photos ( url, is_primary )
    `)
    .eq("is_active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("name");

  if (error || !data) return { stops: [], categories: [] };

  const rows = (data as unknown as Row[]).filter(
    (r) => r.destination_categories !== null,
  );

  const bundle = await loadTranslations(
    rows.map((r) => ({ entity_type: "destination", entity_id: r.id })),
    locale,
  );

  const stops: BuilderStop[] = rows.map((r) => {
    const ent = { entity_type: "destination", entity_id: r.id };
    const photos = r.stop_photos ?? [];
    const photo =
      photos.find((p) => p.is_primary)?.url ?? photos[0]?.url ?? null;
    return {
      id: r.id,
      slug: r.slug,
      name: tr(bundle, ent, "name", r.name),
      area: r.area ?? null,
      category_id: r.destination_categories!.id,
      category_name: r.destination_categories!.name,
      requires_booking: r.requires_booking,
      is_adult_only: r.is_adult_only,
      primary_photo_url: photo,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      duration_minutes: r.duration_minutes ?? DEFAULT_DURATION_MINUTES,
    };
  });

  const catMap = new Map<string, PublicCategory>();
  for (const r of rows) {
    const c = r.destination_categories!;
    if (!catMap.has(c.id)) catMap.set(c.id, { id: c.id, name: c.name, slug: c.slug });
  }
  const categories = [...catMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { stops, categories };
}
