import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CityRow = {
  id: string;
  slug: string;
  name: string;
  country_code: string;
  timezone: string;
  currency: string;
  airport_iata: string | null;
  is_active: boolean;
  launched_at: string | null;
  created_at: string;
};

export async function listCities(): Promise<CityRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, slug, name, country_code, timezone, currency, airport_iata, is_active, launched_at, created_at")
    .order("name");

  if (error) throw error;
  return (data ?? []) as CityRow[];
}
