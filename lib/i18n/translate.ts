import { createClient } from "@/lib/supabase/server";
import { FALLBACK_CHAIN, type Locale } from "@/lib/i18n/locales";

/** Bundle key = `${entity_type}:${entity_id}:${field}` */
export type TBundle = Map<string, string>;

type Row = {
  entity_type: string;
  entity_id: string;
  field: string;
  language: string;
  value: string;
};

/**
 * Load translations for a batch of entities, respecting the fallback chain.
 * Returns a Map keyed by `entity_type:entity_id:field` with the best
 * available translation for the requested locale.
 */
export async function loadTranslations(
  ids: Array<{ entity_type: string; entity_id: string }>,
  locale: Locale,
): Promise<TBundle> {
  if (ids.length === 0) return new Map();

  const langs = [locale, ...FALLBACK_CHAIN[locale]];
  const entityIds = [...new Set(ids.map((x) => x.entity_id))];

  const supabase = createClient();
  const { data } = await supabase
    .from("translations")
    .select("entity_type, entity_id, field, language, value")
    .in("entity_id", entityIds)
    .in("language", langs);

  const rows = (data ?? []) as Row[];
  const bundle: TBundle = new Map();

  // Populate fallbacks first (lowest priority), then override with better matches.
  for (const lang of [...langs].reverse()) {
    for (const r of rows.filter((x) => x.language === lang)) {
      bundle.set(`${r.entity_type}:${r.entity_id}:${r.field}`, r.value);
    }
  }

  return bundle;
}

/** Look up a translated value, falling back to the raw DB content. */
export function tr(
  bundle: TBundle,
  entity: { entity_type: string; entity_id: string },
  field: string,
  fallback: string,
): string {
  return bundle.get(`${entity.entity_type}:${entity.entity_id}:${field}`) ?? fallback;
}
