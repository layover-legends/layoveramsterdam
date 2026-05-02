// Auto-translate a single entity (destination, tour, article) into every
// non-EN locale via DeepL. Server-only.
//
// Called from admin server actions after a save/insert. Designed to be safe
// to call on every save:
//   - skips rows where translated_by='human' (never clobbers manual edits)
//   - skips AI rows whose source_hash matches the current source (no churn)
//   - parallelises across locales (one Promise per target language)
//   - never throws — caller can ignore the result, or surface it in the UI

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { deepl, sourceHash } from "./providers/deepl";
import { loadGlossary } from "./glossary";
import type { Locale } from "./locales";

type EntityKind = "destination" | "tour" | "article";

const SOURCE_TABLE: Record<EntityKind, string> = {
  destination: "destinations",
  tour: "tours",
  article: "articles",
};

const FIELDS_BY_KIND: Record<EntityKind, readonly string[]> = {
  destination: ["name", "description", "area"] as const,
  tour: ["name", "description", "tagline"] as const,
  article: ["title", "excerpt", "body_md"] as const,
};

// Target locales for auto-fill. FR is excluded by default because the
// original seed content was curated French and we never want to clobber it
// without explicit intent.
const DEFAULT_TARGET_LOCALES: Locale[] = ["nl", "de", "es", "it", "pt", "zh"];

export type AutoTranslateOptions = {
  /** Override target locales. Default: nl/de/es/it/pt/zh. */
  locales?: Locale[];
  /** If true, also re-translate rows where translated_by='human'. */
  overwriteHuman?: boolean;
};

export type AutoTranslateResult = {
  ok: boolean;
  written: number;
  skipped: number;
  errors: string[];
  perLocale: Record<string, "done" | "skipped" | "error">;
};

export async function autoTranslateEntity(
  kind: EntityKind,
  entityId: string,
  opts: AutoTranslateOptions = {},
): Promise<AutoTranslateResult> {
  const result: AutoTranslateResult = {
    ok: true,
    written: 0,
    skipped: 0,
    errors: [],
    perLocale: {},
  };

  if (!process.env.DEEPL_API_KEY) {
    result.ok = false;
    result.errors.push("DEEPL_API_KEY not set in environment");
    return result;
  }

  const supabase = createClient();
  const fields = FIELDS_BY_KIND[kind];
  const targets = opts.locales ?? DEFAULT_TARGET_LOCALES;

  // 1) Read source (EN) content
  const { data: srcRow, error: srcErr } = await supabase
    .from(SOURCE_TABLE[kind])
    .select(fields.join(","))
    .eq("id", entityId)
    .single();
  if (srcErr || !srcRow) {
    result.ok = false;
    result.errors.push(`source row not found: ${srcErr?.message ?? entityId}`);
    return result;
  }

  const source = srcRow as unknown as Record<string, string | null>;
  const fieldTexts: Array<{ field: string; text: string; hash: string }> = [];
  for (const f of fields) {
    const v = source[f];
    if (v && v.trim()) fieldTexts.push({ field: f, text: v, hash: sourceHash(v) });
  }
  if (fieldTexts.length === 0) return result;

  // 2) Fetch existing translation rows so we can skip fresh ones + preserve human ones
  const { data: existingRows } = await supabase
    .from("translations")
    .select("field, language, source_hash, translated_by")
    .eq("entity_type", kind)
    .eq("entity_id", entityId)
    .in("language", targets as unknown as string[]);

  const existing = new Map<string, { source_hash: string | null; translated_by: string | null }>();
  for (const r of (existingRows ?? []) as Array<{
    field: string; language: string; source_hash: string | null; translated_by: string | null;
  }>) {
    existing.set(`${r.field}:${r.language}`, {
      source_hash: r.source_hash,
      translated_by: r.translated_by,
    });
  }

  // 3) Translate each locale in parallel
  await Promise.allSettled(
    targets.map(async (locale) => {
      try {
        const toTranslate = fieldTexts.filter(({ field, hash }) => {
          const have = existing.get(`${field}:${locale}`);
          if (!have) return true;
          if (have.translated_by === "human" && !opts.overwriteHuman) return false;
          if (have.source_hash === hash) return false; // already up to date
          return true;
        });

        if (toTranslate.length === 0) {
          result.perLocale[locale] = "skipped";
          result.skipped += fieldTexts.length;
          return;
        }

        const glossary = await loadGlossary(locale);
        const { translations } = await deepl.translateBatch(
          toTranslate.map((x) => x.text),
          "en",
          locale,
          { glossary },
        );

        const upserts = toTranslate.map((x, i) => ({
          entity_type: kind,
          entity_id: entityId,
          field: x.field,
          language: locale,
          value: translations[i],
          translated_by: "ai" as const,
          source_locale: "en",
          source_hash: x.hash,
          is_stale: false,
        }));

        const { error: upErr } = await supabase
          .from("translations")
          .upsert(upserts, { onConflict: "entity_type,entity_id,field,language" });
        if (upErr) throw new Error(upErr.message);

        result.written += upserts.length;
        result.perLocale[locale] = "done";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`${locale}: ${msg}`);
        result.perLocale[locale] = "error";
      }
    }),
  );

  if (result.errors.length > 0) result.ok = false;
  return result;
}

/**
 * When source content changes, mark every dependent translation row stale
 * EXCEPT the EN source mirror. Useful before re-running autoTranslateEntity
 * with intent to refresh.
 */
export async function markAllTranslationsStale(
  kind: EntityKind,
  entityId: string,
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("translations")
    .update({ is_stale: true })
    .eq("entity_type", kind)
    .eq("entity_id", entityId)
    .neq("language", "en");
}
