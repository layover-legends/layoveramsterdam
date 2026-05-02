// Auto-translate a single entity (destination, tour, article) into every
// non-EN locale via DeepL. Server-only.
//
// Called from admin server actions after a save/insert. Designed to be safe
// to call on every save:
//   - skips rows where translated_by='human' (never clobbers manual edits)
//   - skips AI rows whose source_hash matches the current source (no churn)
//   - parallelises across locales (one Promise per target language)
//   - never throws — caller can ignore the result, or surface it in the UI
//   - always writes a translation_jobs row so the dashboard can audit outcomes

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { deepl, sourceHash } from "./providers/deepl";
import { loadGlossary } from "./glossary";
import type { Locale } from "./locales";

type EntityKind = "destination" | "tour" | "article";

export type TriggerSource = "admin_save" | "admin_button" | "cli_bulk" | "cron";

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

// Includes 'fr' — historically excluded because seed content was already in
// French, but post source-flip the source is EN so FR also needs translation.
const DEFAULT_TARGET_LOCALES: Locale[] = ["fr", "nl", "de", "es", "it", "pt", "zh"];

export type AutoTranslateOptions = {
  /** Override target locales. Default: nl/de/es/it/pt/zh. */
  locales?: Locale[];
  /** If true, also re-translate rows where translated_by='human'. */
  overwriteHuman?: boolean;
  /** Admin user UUID — written to translation_jobs.triggered_by. */
  triggeredBy?: string;
  /** Calling surface — written to translation_jobs.trigger_source. */
  triggerSource?: TriggerSource;
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
  const startMs = Date.now();
  const triggerSource = opts.triggerSource ?? "admin_save";

  const result: AutoTranslateResult = {
    ok: true,
    written: 0,
    skipped: 0,
    errors: [],
    perLocale: {},
  };

  // ── DEEPL key guard — loud, not silent ──────────────────────────────────
  if (!process.env.DEEPL_API_KEY) {
    console.error(
      "[autoTranslateEntity] DEEPL_API_KEY missing on Vercel runtime — " +
      "add it in Vercel project Settings → Environment Variables. " +
      "Entity was NOT translated: %s %s (trigger=%s)",
      kind, entityId, triggerSource,
    );
    result.ok = false;
    result.errors.push("DEEPL_API_KEY not set in environment");
    await writeJobRow({ kind, entityId, result, startMs, opts, triggerSource, deepl_chars: 0 });
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
    await writeJobRow({ kind, entityId, result, startMs, opts, triggerSource, deepl_chars: 0 });
    return result;
  }

  const source = srcRow as unknown as Record<string, string | null>;
  const fieldTexts: Array<{ field: string; text: string; hash: string }> = [];
  for (const f of fields) {
    const v = source[f];
    if (v && v.trim()) fieldTexts.push({ field: f, text: v, hash: sourceHash(v) });
  }
  if (fieldTexts.length === 0) {
    await writeJobRow({ kind, entityId, result, startMs, opts, triggerSource, deepl_chars: 0 });
    return result;
  }

  // 2) Fetch existing rows to skip fresh AI and preserve human edits
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
  let deepl_chars = 0;

  await Promise.allSettled(
    targets.map(async (locale) => {
      try {
        const toTranslate = fieldTexts.filter(({ field, hash }) => {
          const have = existing.get(`${field}:${locale}`);
          if (!have) return true;
          if (have.translated_by === "human" && !opts.overwriteHuman) return false;
          if (have.source_hash === hash) return false;
          return true;
        });

        if (toTranslate.length === 0) {
          result.perLocale[locale] = "skipped";
          result.skipped += fieldTexts.length;
          return;
        }

        const glossary = await loadGlossary(locale);
        const { translations, charsBilled } = await deepl.translateBatch(
          toTranslate.map((x) => x.text),
          "en",
          locale,
          { glossary },
        );
        deepl_chars += charsBilled;

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

  // 4) Structured log — visible in Vercel function logs
  const duration_ms = Date.now() - startMs;
  console.log(
    "[autoTranslateEntity] %s %s | trigger=%s | fields=%d locales=%s | " +
    "written=%d skipped=%d ok=%s chars=%d duration=%dms%s",
    kind, entityId, triggerSource,
    fieldTexts.length, targets.join(","),
    result.written, result.skipped, result.ok,
    deepl_chars, duration_ms,
    result.errors.length > 0 ? ` | errors=${JSON.stringify(result.errors)}` : "",
  );

  // 5) Persist job row for the dashboard
  await writeJobRow({ kind, entityId, result, startMs, opts, triggerSource, deepl_chars });

  return result;
}

// ── Job-row writer (fire-and-log, never throws) ──────────────────────────────

async function writeJobRow({
  kind,
  entityId,
  result,
  startMs,
  opts,
  triggerSource,
  deepl_chars,
}: {
  kind: EntityKind;
  entityId: string;
  result: AutoTranslateResult;
  startMs: number;
  opts: AutoTranslateOptions;
  triggerSource: TriggerSource;
  deepl_chars: number;
}) {
  try {
    const supabase = createClient();
    await supabase.from("translation_jobs").insert({
      entity_type:    kind,
      entity_id:      entityId,
      triggered_by:   opts.triggeredBy ?? null,
      trigger_source: triggerSource,
      written:        result.written,
      skipped:        result.skipped,
      errors:         result.errors,
      per_locale:     result.perLocale,
      duration_ms:    Date.now() - startMs,
      deepl_chars,
    });
  } catch (e) {
    // A job-log failure must never surface to the user.
    console.error("[autoTranslateEntity] failed to write translation_jobs row:", e);
  }
}

/**
 * Mark every non-EN translation row stale for an entity so the next
 * autoTranslateEntity call re-translates them.
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
