import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/locales";

/** Bundle key = `${entity_type}:${entity_id}:${field}` → translated value */
export type TBundle = Map<string, string>;

type Row = {
  entity_type: string;
  entity_id: string;
  field: string;
  language: string;
  value: string;
};

/**
 * Build a bundle from raw translation rows (pure — no I/O).
 *
 * Only rows whose `language` matches `locale` are placed in the bundle.
 * Everything else is ignored intentionally: cross-language fallback must
 * NOT happen here because the source row already carries the original
 * content and is the correct level-2 fallback (handled by tr()).
 *
 * Priority chain in practice:
 *   (1) translation row for this locale  ← bundle
 *   (2) source column on the entity row  ← tr()'s `fallback` param
 *   (3) hardcoded UI string              ← t()'s `fallback` param
 */
export function buildBundle(rows: Row[], locale: Locale): TBundle {
  const bundle: TBundle = new Map();
  for (const r of rows) {
    if (r.language === locale) {
      bundle.set(`${r.entity_type}:${r.entity_id}:${r.field}`, r.value);
    }
  }
  return bundle;
}

/**
 * Load translations for a batch of entities.
 * Returns a bundle containing ONLY rows for the exact requested locale.
 * Do not add FALLBACK_CHAIN here — that collapses the wrong priority levels
 * and causes a locale=fr user to see EN text when no FR translation exists
 * but an EN one does (instead of seeing the original source content).
 */
export async function loadTranslations(
  ids: Array<{ entity_type: string; entity_id: string }>,
  locale: Locale,
): Promise<TBundle> {
  if (ids.length === 0) return new Map();

  const entityIds = [...new Set(ids.map((x) => x.entity_id))];
  const supabase = createClient();

  const { data } = await supabase
    .from("translations")
    .select("entity_type, entity_id, field, language, value")
    .in("entity_id", entityIds)
    .eq("language", locale); // exact locale only — no cross-language fallback

  return buildBundle((data ?? []) as Row[], locale);
}

/**
 * Look up a translated value.
 *
 *   bundle hit → translated string
 *   bundle miss → `fallback` (pass the entity's own source column here)
 */
export function tr(
  bundle: TBundle,
  entity: { entity_type: string; entity_id: string },
  field: string,
  fallback: string,
): string {
  return bundle.get(`${entity.entity_type}:${entity.entity_id}:${field}`) ?? fallback;
}
