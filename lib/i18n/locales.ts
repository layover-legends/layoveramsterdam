// Client-safe — no server imports.

export const LOCALES = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "it", label: "Italiano",   flag: "🇮🇹" },
  { code: "pt", label: "Português",  flag: "🇵🇹" },
  { code: "zh", label: "中文",        flag: "🇨🇳" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const LOCALE_CODES = new Set<string>(LOCALES.map((l) => l.code));

export const DEFAULT_LOCALE: Locale = "en";

/** For a given locale, which locales to try (in order) if the translation
 *  doesn't exist. Empty = fall back to raw DB content (which is French). */
export const FALLBACK_CHAIN: Record<Locale, Locale[]> = {
  en: [],
  fr: ["en"],
  nl: ["en"],
  de: ["en"],
  es: ["en", "fr"],
  it: ["en", "fr"],
  pt: ["es", "en", "fr"],
  zh: ["en"],
};

/** Maps our locale codes to Open Graph locale strings. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  nl: "nl_NL",
  de: "de_DE",
  es: "es_ES",
  it: "it_IT",
  pt: "pt_PT",
  zh: "zh_CN",
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && LOCALE_CODES.has(v);
}
