// Provider abstraction for translation services.
// Currently only DeepL is implemented; the interface is here so swapping
// providers later (Google, OpenAI, Azure) is one new file, not a rewrite.

import type { Locale } from "@/lib/i18n/locales";

export interface GlossaryEntry {
  source_term: string;
  target_term: string;
  do_not_translate: boolean;
  case_sensitive: boolean;
}

export interface TranslateOptions {
  /** Optional glossary applied via placeholder substitution. */
  glossary?: GlossaryEntry[];
  /** DeepL has formality control on some pairs; ignored elsewhere. */
  formality?: "default" | "more" | "less";
}

export interface TranslateResult {
  /** One translated string per input string, same order. */
  translations: string[];
  /** Provider name that produced the result, e.g. "deepl". */
  provider: string;
  /** Total source characters consumed (for quota tracking). */
  charsBilled: number;
}

export interface TranslationProvider {
  name: string;
  /**
   * Translate `texts` from `source` locale to `target` locale.
   * MUST throw on failure — never silently return source strings, that
   * pattern leaks the wrong language onto pages.
   */
  translateBatch(
    texts: string[],
    source: Locale,
    target: Locale,
    opts?: TranslateOptions,
  ): Promise<TranslateResult>;
}
