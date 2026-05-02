import "server-only";

import { createClient } from "@/lib/supabase/server";

export type FeaturedTour = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  price_cents: number | null;
  currency: string;
  duration_hours: number | null;
  max_group_size: number | null;
  is_adult_only: boolean;
};

export async function getFeaturedTours(): Promise<FeaturedTour[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tours")
      .select("id, name, slug, tagline, price_cents, currency, duration_hours, max_group_size, is_adult_only")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) return [];
    return (data ?? []) as FeaturedTour[];
  } catch {
    return [];
  }
}

export async function getAllTours(): Promise<FeaturedTour[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tours")
      .select("id, name, slug, tagline, price_cents, currency, duration_hours, max_group_size, is_adult_only")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) return [];
    return (data ?? []) as FeaturedTour[];
  } catch {
    return [];
  }
}
