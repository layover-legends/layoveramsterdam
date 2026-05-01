import { createClient } from "@/lib/supabase/server";

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
  meta_title: string | null;
  meta_description: string | null;
};

type Row = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  duration_hours: number | null;
  price_cents: number | null;
  currency: string;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
};

export async function getTourBySlug(slug: string): Promise<TourDetail | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tours")
    .select(
      "id, name, slug, tagline, description, duration_hours, price_cents, currency, is_active, meta_title, meta_description",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  const r = data as unknown as Row;
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
    meta_title: r.meta_title,
    meta_description: r.meta_description,
  };
}
