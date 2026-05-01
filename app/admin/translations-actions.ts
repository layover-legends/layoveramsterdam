"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isLocale } from "@/lib/i18n/locales";

const MAX_VALUE = 2000;

export async function upsertTranslation(
  entityType: string,
  entityId: string,
  field: string,
  language: string,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  if (!isLocale(language)) return { ok: false, error: "Invalid language." };
  if (value.length > MAX_VALUE) return { ok: false, error: `Value must be ${MAX_VALUE} chars or fewer.` };

  const trimmed = value.trim();

  const supabase = createClient();

  if (!trimmed) {
    // Empty value = delete the translation row (revert to fallback).
    await supabase
      .from("translations")
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("field", field)
      .eq("language", language);
  } else {
    const { error } = await supabase.from("translations").upsert(
      { entity_type: entityType, entity_id: entityId, field, language, value: trimmed },
      { onConflict: "entity_type,entity_id,field,language" },
    );
    if (error) return { ok: false, error: error.message };
  }

  // Revalidate wherever this entity might appear.
  revalidatePath(`/admin/${entityType === "destination" ? "stops" : "tours"}/${entityId}`);
  revalidatePath("/blog");

  return { ok: true };
}
