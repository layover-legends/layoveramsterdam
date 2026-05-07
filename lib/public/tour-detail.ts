import { createClient } from "@/lib/supabase/server";

export type TourHeroPhoto = {
  id: string;
  storage_path: string;
  cdn_url: string | null;
  alt_text: string;
  blurhash: string | null;
  dominant_color: string | null;
  aspect_ratios_generated: string[];
};

export type TourDetail = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  duration_hours: number | null;
  price_cents: number | null;
  currency: string;
  is_active: boolean;
  is_adult_only: boolean;
  avg_rating: number | null;
  reviews_count: number;
  last_review_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  image_url: string | null;
  /** Full photo row when available — enables responsive srcset rendering. */
  photo: TourHeroPhoto | null;
};

type Row = Omit<TourDetail, "photo">;

export async function getTourBySlug(slug: string): Promise<TourDetail | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tours")
    .select(
      "id, name, slug, tagline, description, duration_hours, price_cents, currency, is_active, is_adult_only, avg_rating, reviews_count, last_review_at, meta_title, meta_description, image_url",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  const r = data as unknown as Row;

  // Resolve hero photo via photo_usage → photos so we get full srcset support
  let photo: TourHeroPhoto | null = null;
  const { data: usage } = await supabase
    .from("photo_usage")
    .select("photo_id")
    .eq("entity_type", "tour")
    .eq("entity_id", r.id)
    .eq("field_name", "hero_image")
    .maybeSingle();
  const photoId = (usage as { photo_id: string } | null)?.photo_id;
  if (photoId) {
    const { data: pData } = await supabase
      .from("photos")
      .select("id, storage_path, cdn_url, alt_text, blurhash, dominant_color, aspect_ratios_generated")
      .eq("id", photoId)
      .maybeSingle();
    if (pData) photo = pData as unknown as TourHeroPhoto;
  }

  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    tagline: r.tagline,
    description: r.description,
    duration_hours: r.duration_hours !== null ? Number(r.duration_hours) : null,
    price_cents: r.price_cents,
    currency: r.currency,
    is_active: r.is_active,
    is_adult_only: r.is_adult_only ?? false,
    avg_rating: r.avg_rating ?? null,
    reviews_count: r.reviews_count ?? 0,
    last_review_at: r.last_review_at ?? null,
    meta_title: r.meta_title,
    meta_description: r.meta_description,
    image_url: r.image_url,
    photo,
  };
}
