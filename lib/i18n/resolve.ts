import { cookies, headers } from "next/headers";
import { isLocale, DEFAULT_LOCALE, LOCALE_CODES, type Locale } from "@/lib/i18n/locales";

/** Parse Accept-Language header and return the best matching locale code. */
function matchAcceptLanguage(header: string): Locale | null {
  // "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  const parts = header
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { tag: tag.trim().split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    if (LOCALE_CODES.has(tag) && isLocale(tag)) return tag;
  }
  return null;
}

/**
 * Server-only locale resolver. Priority:
 *  1. `lang` cookie (set by the language switcher)
 *  2. `Accept-Language` request header
 *  3. DEFAULT_LOCALE ("en")
 */
export function resolveLocale(): Locale {
  const cookieLang = cookies().get("lang")?.value;
  if (isLocale(cookieLang)) return cookieLang;

  const acceptLang = headers().get("accept-language") ?? "";
  if (acceptLang) {
    const matched = matchAcceptLanguage(acceptLang);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}
