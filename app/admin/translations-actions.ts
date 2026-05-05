"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { UI_STRINGS_CACHE_TAG } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { deepl, sourceHash } from "@/lib/i18n/providers/deepl";
import { loadGlossary } from "@/lib/i18n/glossary";

const MAX_VALUE = 2000;

// Tables that hold the EN source content for each entity type.
const ENTITY_TABLE: Record<string, string> = {
  destination: "destinations",
  tour:        "tours",
  article:     "articles",
};

// Revalidate paths that render this entity.
function revalidateEntity(entityType: string, entityId: string) {
  if (entityType === "destination") {
    revalidatePath(`/admin/stops/${entityId}`);
    revalidatePath("/admin/stops");
  } else if (entityType === "tour") {
    revalidatePath(`/admin/tours/${entityId}`);
    revalidatePath("/admin/tours");
  } else if (entityType === "article") {
    revalidatePath(`/admin/articles/${entityId}`);
  } else if (entityType === "ui") {
    // Bust the getUiStrings() cache so the change is visible on the public
    // site immediately rather than waiting for the 1-hour TTL.
    revalidateTag(UI_STRINGS_CACHE_TAG);
  }
}

/**
 * Upsert a single translation field with translated_by='human'.
 * Reads the current EN source value to stamp source_hash so the row
 * is never flagged as stale after a manual edit.
 * Empty value = delete the row (revert to source fallback).
 */
export async function upsertTranslation(
  entityType: string,
  entityId: string,
  field: string,
  language: string,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  if (!isLocale(language)) return { ok: false, error: "Invalid language." };
  if (value.length > MAX_VALUE)
    return { ok: false, error: `Value must be ${MAX_VALUE} chars or fewer.` };

  const trimmed = value.trim();
  const supabase = createClient();

  if (!trimmed) {
    await supabase
      .from("translations")
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("field", field)
      .eq("language", language);
  } else {
    // Stamp source_hash from the current EN source so the row stays fresh.
    let hash: string | undefined;
    const table = ENTITY_TABLE[entityType];
    if (table) {
      const { data: src } = await supabase
        .from(table)
        .select(field)
        .eq("id", entityId)
        .maybeSingle();
      const srcText = (src as unknown as Record<string, string | null> | null)?.[field];
      if (srcText?.trim()) hash = sourceHash(srcText);
    }

    const { error } = await supabase.from("translations").upsert(
      {
        entity_type:    entityType,
        entity_id:      entityId,
        field,
        language,
        value:          trimmed,
        translated_by:  "human",
        source_locale:  "en",
        is_stale:       false,
        ...(hash ? { source_hash: hash } : {}),
      },
      { onConflict: "entity_type,entity_id,field,language" },
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidateEntity(entityType, entityId);
  return { ok: true };
}

/**
 * Auto-translate a single field for a single locale via DeepL.
 * Writes translated_by='ai' + source_hash so the row is considered fresh.
 * Returns the translated string so the client can update its local state
 * without a full page reload.
 */
export async function autoTranslateField(
  entityType: string,
  entityId: string,
  field: string,
  targetLocale: string,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  await requireAdmin();

  if (!isLocale(targetLocale))
    return { ok: false, error: "Invalid locale." };

  const table = ENTITY_TABLE[entityType];
  if (!table) return { ok: false, error: "Unknown entity type." };

  if (!process.env.DEEPL_API_KEY) {
    return {
      ok: false,
      error:
        "DEEPL_API_KEY is not set in Vercel Environment Variables — " +
        "add it under Project Settings → Environment Variables.",
    };
  }

  const supabase = createClient();

  // Read the EN source value.
  const { data: src, error: srcErr } = await supabase
    .from(table)
    .select(field)
    .eq("id", entityId)
    .maybeSingle();

  if (srcErr || !src)
    return { ok: false, error: `Source entity not found: ${srcErr?.message ?? entityId}` };

  const sourceText = (src as unknown as Record<string, string | null>)[field]?.trim();
  if (!sourceText)
    return { ok: false, error: `Field "${field}" is empty — nothing to translate.` };

  // Translate via DeepL with glossary.
  let translated: string;
  try {
    const glossary = await loadGlossary(targetLocale as Locale);
    const { translations } = await deepl.translateBatch(
      [sourceText],
      "en",
      targetLocale as Locale,
      { glossary },
    );
    translated = translations[0];
    if (!translated) throw new Error("DeepL returned an empty result.");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Upsert the translated row.
  const hash = sourceHash(sourceText);
  const { error: upErr } = await supabase.from("translations").upsert(
    {
      entity_type:    entityType,
      entity_id:      entityId,
      field,
      language:       targetLocale,
      value:          translated,
      translated_by:  "ai",
      source_locale:  "en",
      source_hash:    hash,
      is_stale:       false,
    },
    { onConflict: "entity_type,entity_id,field,language" },
  );
  if (upErr) return { ok: false, error: upErr.message };

  revalidateEntity(entityType, entityId);
  return { ok: true, value: translated };
}
