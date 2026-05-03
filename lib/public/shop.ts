import "server-only";

import { createClient } from "@/lib/supabase/server";
import { FALLBACK_CHAIN, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/locales";

export type PublicService = {
  id: string;
  slug: string;
  category: string;
  name: string;
  short_blurb: string | null;
  description: string | null;
  price_cents: number;
  pricing_model: "flat" | "per_person";
  vat_rate: number;
  fulfillment: string;
  service_type: "standalone" | "both";
  availability_status: "active" | "coming_soon";
  is_recommended: boolean;
  image_url: string | null;
};

type ServiceRow = {
  id: string;
  slug: string;
  category: string;
  fulfillment: string;
  pricing_model: string;
  price_cents: number;
  vat_rate: number;
  sort_order: number;
  image_url: string | null;
  service_type: string;
  availability_status: string;
};

type TransRow = {
  entity_id: string;
  field: string;
  language: string;
  value: string;
};

function buildTransMap(rows: TransRow[]): Map<string, Record<string, Record<string, string>>> {
  const tMap = new Map<string, Record<string, Record<string, string>>>();
  for (const row of rows) {
    if (!tMap.has(row.entity_id)) tMap.set(row.entity_id, {});
    const byField = tMap.get(row.entity_id)!;
    if (!byField[row.field]) byField[row.field] = {};
    byField[row.field][row.language] = row.value;
  }
  return tMap;
}

function makePicker(
  tMap: Map<string, Record<string, Record<string, string>>>,
  unique: string[],
) {
  return (entityId: string, field: string): string | null => {
    const byField = tMap.get(entityId);
    if (!byField?.[field]) return null;
    for (const lang of unique) {
      if (byField[field][lang]) return byField[field][lang];
    }
    return null;
  };
}

export async function getShopServices(locale: string): Promise<PublicService[]> {
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("addons")
    .select("id, slug, category, fulfillment, pricing_model, price_cents, vat_rate, sort_order, service_type, availability_status, image_url")
    .in("service_type", ["standalone", "both"])
    .neq("availability_status", "inactive")
    .eq("is_active", true)
    .order("sort_order");

  const services = (rows ?? []) as ServiceRow[];
  if (services.length === 0) return [];

  const ids = services.map((s) => s.id);
  const langs = isLocale(locale) ? [locale, ...FALLBACK_CHAIN[locale], DEFAULT_LOCALE] : [DEFAULT_LOCALE];
  const unique = [...new Set(langs)] as string[];

  const { data: transRows } = await supabase
    .from("translations")
    .select("entity_id, field, language, value")
    .eq("entity_type", "addon")
    .in("entity_id", ids)
    .in("language", unique)
    .in("field", ["name", "short_blurb", "description"]);

  const tMap = buildTransMap((transRows ?? []) as TransRow[]);
  const pick = makePicker(tMap, unique);

  return services.map((s) => ({
    id: s.id,
    slug: s.slug,
    category: s.category,
    name: pick(s.id, "name") ?? s.slug,
    short_blurb: pick(s.id, "short_blurb"),
    description: pick(s.id, "description"),
    price_cents: s.price_cents,
    pricing_model: s.pricing_model as "flat" | "per_person",
    vat_rate: Number(s.vat_rate),
    fulfillment: s.fulfillment,
    service_type: s.service_type as "standalone" | "both",
    availability_status: s.availability_status as "active" | "coming_soon",
    is_recommended: false,
    image_url: s.image_url,
  }));
}

export async function getShopServiceBySlug(
  slug: string,
  locale: string,
): Promise<PublicService | null> {
  const supabase = createClient();

  const { data: row } = await supabase
    .from("addons")
    .select("id, slug, category, fulfillment, pricing_model, price_cents, vat_rate, sort_order, service_type, availability_status, image_url")
    .eq("slug", slug)
    .in("service_type", ["standalone", "both"])
    .neq("availability_status", "inactive")
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return null;

  const s = row as ServiceRow;
  const langs = isLocale(locale) ? [locale, ...FALLBACK_CHAIN[locale], DEFAULT_LOCALE] : [DEFAULT_LOCALE];
  const unique = [...new Set(langs)] as string[];

  const { data: transRows } = await supabase
    .from("translations")
    .select("entity_id, field, language, value")
    .eq("entity_type", "addon")
    .eq("entity_id", s.id)
    .in("language", unique)
    .in("field", ["name", "short_blurb", "description"]);

  const tMap = buildTransMap((transRows ?? []) as TransRow[]);
  const pick = makePicker(tMap, unique);

  return {
    id: s.id,
    slug: s.slug,
    category: s.category,
    name: pick(s.id, "name") ?? s.slug,
    short_blurb: pick(s.id, "short_blurb"),
    description: pick(s.id, "description"),
    price_cents: s.price_cents,
    pricing_model: s.pricing_model as "flat" | "per_person",
    vat_rate: Number(s.vat_rate),
    fulfillment: s.fulfillment,
    service_type: s.service_type as "standalone" | "both",
    availability_status: s.availability_status as "active" | "coming_soon",
    is_recommended: false,
    image_url: s.image_url,
  };
}
