import "server-only";

import { createClient } from "@/lib/supabase/server";
import { FALLBACK_CHAIN, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/locales";

export type PublicAddon = {
  id: string;
  slug: string;
  category: string;
  name: string;
  short_blurb: string | null;
  description: string | null;
  price_cents: number;
  pricing_model: "flat" | "per_person";
  vat_rate: number;
  is_recommended: boolean;
  fulfillment: string;
};

type JoinRow = {
  addon_id: string;
  is_recommended: boolean;
  sort_order: number;
  price_override_cents: number | null;
};

type AddonRow = {
  id: string;
  slug: string;
  category: string;
  fulfillment: string;
  pricing_model: string;
  price_cents: number;
  vat_rate: number;
  sort_order: number;
};

type TransRow = {
  entity_id: string;
  field: string;
  language: string;
  value: string;
};

export async function getTourAddons(tourId: string, locale: string): Promise<PublicAddon[]> {
  const supabase = createClient();

  const { data: joinData } = await supabase
    .from("tour_addons")
    .select("addon_id, is_recommended, sort_order, price_override_cents")
    .eq("tour_id", tourId);

  const joinRows = (joinData ?? []) as JoinRow[];
  if (joinRows.length === 0) return [];

  const addonIds = joinRows.map((r) => r.addon_id);

  const langs = isLocale(locale)
    ? [locale, ...FALLBACK_CHAIN[locale], DEFAULT_LOCALE]
    : [DEFAULT_LOCALE];
  const unique = [...new Set(langs)] as string[];

  const [addonsResult, transResult] = await Promise.all([
    supabase
      .from("addons")
      .select("id, slug, category, fulfillment, pricing_model, price_cents, vat_rate, sort_order")
      .in("id", addonIds)
      .eq("is_active", true),
    supabase
      .from("translations")
      .select("entity_id, field, language, value")
      .eq("entity_type", "addon")
      .in("entity_id", addonIds)
      .in("language", unique)
      .in("field", ["name", "short_blurb", "description"]),
  ]);

  const addonMap = new Map<string, AddonRow>(
    ((addonsResult.data ?? []) as AddonRow[]).map((a) => [a.id, a]),
  );

  // Build: entityId → field → lang → value
  const tMap = new Map<string, Record<string, Record<string, string>>>();
  for (const row of (transResult.data ?? []) as TransRow[]) {
    if (!tMap.has(row.entity_id)) tMap.set(row.entity_id, {});
    const byField = tMap.get(row.entity_id)!;
    if (!byField[row.field]) byField[row.field] = {};
    byField[row.field][row.language] = row.value;
  }

  function pickTrans(entityId: string, field: string): string | null {
    const byField = tMap.get(entityId);
    if (!byField?.[field]) return null;
    for (const lang of unique) {
      if (byField[field][lang]) return byField[field][lang];
    }
    return null;
  }

  const result: PublicAddon[] = joinRows
    .filter((r) => addonMap.has(r.addon_id))
    .map((r) => {
      const a = addonMap.get(r.addon_id)!;
      return {
        id: a.id,
        slug: a.slug,
        category: a.category,
        name: pickTrans(a.id, "name") ?? a.slug,
        short_blurb: pickTrans(a.id, "short_blurb"),
        description: pickTrans(a.id, "description"),
        price_cents: r.price_override_cents ?? a.price_cents,
        pricing_model: a.pricing_model as "flat" | "per_person",
        vat_rate: Number(a.vat_rate),
        is_recommended: r.is_recommended,
        fulfillment: a.fulfillment,
      };
    })
    .sort((a, b) => {
      if (a.is_recommended !== b.is_recommended) return a.is_recommended ? -1 : 1;
      return 0;
    });

  return result;
}

export async function getHeroAddons(tourId: string, locale: string): Promise<PublicAddon[]> {
  const all = await getTourAddons(tourId, locale);
  return all.filter((a) => a.is_recommended).slice(0, 3);
}
