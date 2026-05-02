// DeepL implementation of TranslationProvider.
//
// Server-only. Imports node:crypto. Don't import from a "use client" file.
//
// Glossary handling: we DON'T use DeepL's native glossary feature, because
// it's Pro-only and managing remote glossaries is more friction than it's
// worth. Instead we substitute each glossary term with a non-translatable
// HTML span before sending, then restore the locale-specific replacement on
// the way back. Works on Free and Pro tiers identically.
//
// Failure mode: throws. Caller decides whether to surface the error to the
// admin (button click) or fall through to the existing translation chain
// (page render).

import { createHash } from "node:crypto";
import type { Locale } from "@/lib/i18n/locales";
import type {
  GlossaryEntry,
  TranslateResult,
  TranslationProvider,
} from "./types";

const PRO_URL = "https://api.deepl.com/v2/translate";
const FREE_URL = "https://api-free.deepl.com/v2/translate";

const LOCALE_TO_DEEPL: Record<Locale, string> = {
  en: "EN-US",
  fr: "FR",
  nl: "NL",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "PT-PT",
  zh: "ZH",
};

function endpoint(): string {
  const tier = process.env.DEEPL_API_TIER ?? "pro";
  return tier === "free" ? FREE_URL : PRO_URL;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface Restoration {
  token: string;
  replacement: string;
}

function preprocess(
  text: string,
  glossary: GlossaryEntry[],
): { text: string; restorations: Restoration[] } {
  const restorations: Restoration[] = [];
  let out = text;
  glossary.forEach((g, i) => {
    const token = `<span translate="no">G${i.toString().padStart(4, "0")}</span>`;
    const flags = g.case_sensitive ? "g" : "gi";
    const re = new RegExp(`\\b${escapeRegex(g.source_term)}\\b`, flags);
    if (re.test(out)) {
      out = out.replace(re, token);
      restorations.push({
        token,
        replacement: g.do_not_translate ? g.source_term : g.target_term,
      });
    }
  });
  return { text: out, restorations };
}

function postprocess(text: string, restorations: Restoration[]): string {
  let out = text;
  for (const r of restorations) out = out.split(r.token).join(r.replacement);
  // Strip any leftover wrapper spans DeepL may have left behind.
  out = out.replace(/<\/?span[^>]*>/g, "");
  // Decode HTML entities DeepL emits in tag_handling=html mode.
  // &amp; MUST be last — decoding it first would double-decode e.g. &amp;#x27; → &#x27; → '
  out = out
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g,   "'")
    .replace(/&quot;/g,  '"')
    .replace(/&lt;/g,    "<")
    .replace(/&gt;/g,    ">")
    .replace(/&amp;/g,   "&");
  return out;
}

export const deepl: TranslationProvider = {
  name: "deepl",
  async translateBatch(texts, source, target, opts): Promise<TranslateResult> {
    const key = process.env.DEEPL_API_KEY;
    if (!key) throw new Error("DEEPL_API_KEY not set");
    if (texts.length === 0) {
      return { translations: [], provider: "deepl", charsBilled: 0 };
    }

    const glossary = opts?.glossary ?? [];
    const prepared = texts.map((t) => preprocess(t, glossary));
    const charsBilled = prepared.reduce((n, p) => n + p.text.length, 0);

    const body: Record<string, unknown> = {
      text: prepared.map((p) => p.text),
      source_lang: LOCALE_TO_DEEPL[source].split("-")[0],
      target_lang: LOCALE_TO_DEEPL[target],
      preserve_formatting: true,
      tag_handling: "html",
      ignore_tags: ["span"],
    };
    if (opts?.formality) body.formality = opts.formality;

    const r = await fetch(endpoint(), {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`DeepL ${r.status}: ${errText.slice(0, 500)}`);
    }

    const data = (await r.json()) as { translations: { text: string }[] };
    const translations = data.translations.map((d, i) =>
      postprocess(d.text, prepared[i].restorations),
    );
    return { translations, provider: "deepl", charsBilled };
  },
};

/** sha256 hex of a source string. Used for staleness tracking. */
export function sourceHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
