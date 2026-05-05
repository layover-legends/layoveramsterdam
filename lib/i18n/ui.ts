import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { FALLBACK_CHAIN, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { resolveLocale } from "@/lib/i18n/resolve";

// Re-export pure helpers so server-component imports from ui.ts keep working.
// Client components must import directly from @/lib/i18n/t instead.
export { t, tpl } from "@/lib/i18n/t";

// Cache tag used for on-demand invalidation.
// Call revalidateTag(UI_STRINGS_CACHE_TAG) after any translation write.
export const UI_STRINGS_CACHE_TAG = "ui-strings";

/**
 * Inner fetch — uses admin client (no cookies) so it is safe inside
 * unstable_cache, which runs outside the request context.
 * UI strings are non-sensitive public data; bypassing RLS is correct here.
 */
async function _fetchUiStrings(locale: Locale): Promise<Record<string, string>> {
  const langs = [locale, ...FALLBACK_CHAIN[locale], DEFAULT_LOCALE];
  const unique = [...new Set(langs)];

  const admin = createAdminClient();
  const { data } = await admin
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

/**
 * Cached variant — one entry per locale, revalidated hourly or on
 * revalidateTag("ui-strings") when an admin saves a translation.
 */
const _cachedFetchUiStrings = unstable_cache(
  _fetchUiStrings,
  [UI_STRINGS_CACHE_TAG],
  { revalidate: 3600, tags: [UI_STRINGS_CACHE_TAG] },
);

/**
 * Load UI string translations for the given locale.
 * Falls back through the chain; falls back to DEFAULT_LOCALE values if
 * the chain is exhausted.
 */
export async function loadUiStrings(locale: Locale): Promise<Record<string, string>> {
  return _cachedFetchUiStrings(locale);
}

/**
 * Convenience: resolve locale from request cookies/headers then load the
 * strings bundle in one call.  Use in every server component that renders
 * user-facing text.
 *
 *   const s = await getUiStrings();
 *   <h1>{t(s, "admin.stops.title", "Stops")}</h1>
 *
 * Cache is per-locale, TTL 1 h. Invalidate immediately after any translation
 * write by calling revalidateTag(UI_STRINGS_CACHE_TAG) in the server action.
 */
export async function getUiStrings(): Promise<Record<string, string>> {
  return _cachedFetchUiStrings(resolveLocale());
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
