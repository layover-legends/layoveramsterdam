// The 8 languages the platform officially supports.
// Codes match ISO 639-1 and the keys already loaded into public.translations.
export type SupportedLanguage = {
  code: "en" | "fr" | "de" | "es" | "it" | "nl" | "pt" | "zh";
  name: string;
  nativeName: string;
  flag: string;
};

export const SUPPORTED_LANGUAGES: ReadonlyArray<SupportedLanguage> = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
] as const;

export const LANGUAGE_CODES: ReadonlySet<string> = new Set(
  SUPPORTED_LANGUAGES.map((l) => l.code),
);

export function getLanguage(code: string | null | undefined) {
  if (!code) return SUPPORTED_LANGUAGES[0];
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}
