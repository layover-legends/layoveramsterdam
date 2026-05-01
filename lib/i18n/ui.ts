import { createClient } from "@/lib/supabase/server";
import { FALLBACK_CHAIN, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * Load UI string translations for the given locale.
 * Falls back through the chain; falls back to DEFAULT_LOCALE values if
 * the chain is exhausted.
 */
export async function loadUiStrings(locale: Locale): Promise<Record<string, string>> {
  const langs = [locale, ...FALLBACK_CHAIN[locale], DEFAULT_LOCALE];
  const unique = [...new Set(langs)];

  const supabase = createClient();
  const { data } = await supabase
    .from("translations")
    .select("field, language, value")
    .eq("entity_type", "ui")
    .in("language", unique);

  const map: Record<string, Record<string, string>> = {};
  for (const row of (data ?? []) as Array<{ field: string; language: string; value: string }>) {
    if (!map[row.field]) map[row.field] = {};
    map[row.field][row.language] = row.value;
  }

  const result: Record<string, string> = {};
  for (const [field, byLang] of Object.entries(map)) {
    for (const lang of unique) {
      if (byLang[lang]) { result[field] = byLang[lang]; break; }
    }
  }
  return result;
}

/** Synchronous lookup against a pre-loaded UI string map; falls back to key. */
export function t(strings: Record<string, string>, key: string, fallback?: string): string {
  return strings[key] ?? fallback ?? key;
}

/** Keys used across public pages. Always fetch these. */
export const UI_KEYS = {
  NAV_HOME:        "nav.home",
  NAV_BLOG:        "nav.blog",
  NAV_TOURS:       "nav.tours",
  BLOG_TITLE:      "blog.index.title",
  BLOG_DESC:       "blog.index.description",
  BLOG_EMPTY:      "blog.empty",
  STOPS_EMPTY:     "stops.empty",
  FOOTER_BACK:     "footer.back_to_site",
  LAYOVER_TAGLINE: "site.tagline",
} as const;
