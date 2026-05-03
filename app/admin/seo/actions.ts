"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { autoTranslateEntity } from "@/lib/i18n/auto-translate";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, uniqueSlug } from "@/lib/slug";
import { getSlugStats } from "@/lib/admin/seo";
import { insertSlugRedirect } from "@/lib/admin/redirects";

type Kind = "destination" | "tour" | "article";

function isKind(v: unknown): v is Kind {
  return v === "destination" || v === "tour" || v === "article";
}

/**
 * Force re-translate a single entity into all non-EN locales.
 * Triggered by the "Re-translate" button on a punch-list row.
 */
export async function retranslateEntity(formData: FormData) {
  const admin = await requireAdmin();
  const kind = formData.get("kind");
  const id = (formData.get("id") || "").toString();
  if (!isKind(kind) || !id) {
    redirect("/admin/seo?error=" + encodeURIComponent("Invalid entity reference"));
  }

  let status = "ok";
  let detail = "";
  try {
    const r = await autoTranslateEntity(kind, id, {
      triggeredBy: admin.id,
      triggerSource: "admin_button",
    });
    if (!r.ok) {
      status = "partial";
      detail = r.errors.slice(0, 1).join("; ").slice(0, 100);
    } else if (r.written === 0 && r.skipped === 0) {
      status = "noop";
    }
  } catch (e) {
    status = "failed";
    detail = (e instanceof Error ? e.message : String(e)).slice(0, 100);
  }

  revalidatePath("/admin/seo");
  revalidatePath(`/admin/${kind}s/${id}`);
  redirect(
    `/admin/seo?retranslated=${kind}:${id}&status=${status}` +
      (detail ? `&detail=${encodeURIComponent(detail)}` : ""),
  );
}

// ── Anglicization helpers ─────────────────────────────────────────────────────

const DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate";
const DEEPL_PRO_URL  = "https://api.deepl.com/v2/translate";

async function deeplToEnglish(name: string): Promise<string> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error("DEEPL_API_KEY not set");

  const url = (process.env.DEEPL_API_TIER ?? "pro") === "free" ? DEEPL_FREE_URL : DEEPL_PRO_URL;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: [name],
      target_lang: "EN-US",
      preserve_formatting: true,
      // Omit source_lang → DeepL auto-detects (handles Dutch, French, mixed)
    }),
  });
  if (!r.ok) throw new Error(`DeepL ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = (await r.json()) as { translations: { text: string }[] };
  return data.translations[0]?.text ?? name;
}

/**
 * Suggest an English slug for a single destination.
 * Translates the destination's name via DeepL and slugifies the result.
 * Redirects back with ?suggested_id=<id>&suggested_slug=<slug>.
 */
export async function suggestEnglishSlug(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  if (!id) redirect("/admin/seo");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("destinations")
    .select("name, slug")
    .eq("id", id)
    .single();

  if (!row) redirect("/admin/seo");

  let suggestedSlug = row.slug;
  let errorMsg = "";

  try {
    const englishName = await deeplToEnglish(row.name);
    suggestedSlug = await uniqueSlug({
      base: englishName,
      table: "destinations",
      excludeId: id,
      supabase: admin,
    });
  } catch (e) {
    errorMsg = (e instanceof Error ? e.message : String(e)).slice(0, 120);
  }

  const params = new URLSearchParams({
    suggested_id: id,
    suggested_slug: suggestedSlug,
  });
  if (errorMsg) params.set("suggest_error", errorMsg);
  redirect(`/admin/seo?${params.toString()}`);
}

/**
 * Apply a pre-computed suggested English slug to a destination.
 * Updates the DB row; redirects back with ?applied_id=<id>&applied_slug=<slug>.
 */
export async function applyEnglishSlug(formData: FormData) {
  await requireAdmin();
  const id   = (formData.get("id")   ?? "").toString();
  const slug = (formData.get("slug") ?? "").toString();
  if (!id || !slug) redirect("/admin/seo");

  const admin = createAdminClient();

  // Fetch old slug for redirect registration.
  const { data: oldRow } = await admin
    .from("destinations")
    .select("slug")
    .eq("id", id)
    .single();

  // Re-check uniqueness in case another admin applied a slug concurrently.
  const safeSlug = await uniqueSlug({
    base: slug,
    table: "destinations",
    excludeId: id,
    supabase: admin,
  });

  await admin.from("destinations").update({ slug: safeSlug }).eq("id", id);

  if (oldRow?.slug && oldRow.slug !== safeSlug) {
    await insertSlugRedirect({
      entityType: "destination",
      oldSlug: oldRow.slug,
      newSlug: safeSlug,
    }).catch(() => {});
  }

  revalidatePath("/admin/seo");
  revalidatePath("/admin/stops");
  redirect(
    `/admin/seo?applied_id=${encodeURIComponent(id)}&applied_slug=${encodeURIComponent(safeSlug)}`,
  );
}

/**
 * Bulk-anglicize all French-flavored destination slugs in a single DeepL batch.
 * Translates all names at once (~€0.10 for 25 destinations), updates each row.
 */
export async function bulkAnglicize() {
  await requireAdmin();
  const admin = createAdminClient();
  const key = process.env.DEEPL_API_KEY;
  if (!key) redirect("/admin/seo?bulk_error=" + encodeURIComponent("DEEPL_API_KEY not set"));

  const stats = await getSlugStats();
  const destStats = stats.find((s) => s.table === "destinations");
  const items = destStats?.french_items ?? [];

  if (items.length === 0) {
    redirect("/admin/seo?bulk_result=ok&bulk_count=0");
  }

  // Batch all names in a single DeepL call.
  let englishNames: string[];
  try {
    const url = (process.env.DEEPL_API_TIER ?? "pro") === "free" ? DEEPL_FREE_URL : DEEPL_PRO_URL;
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: items.map((i) => i.name),
        target_lang: "EN-US",
        preserve_formatting: true,
      }),
    });
    if (!r.ok) throw new Error(`DeepL ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = (await r.json()) as { translations: { text: string }[] };
    englishNames = data.translations.map((t) => t.text);
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 120);
    redirect("/admin/seo?bulk_error=" + encodeURIComponent(msg));
  }

  // Apply each slug update (sequential to avoid race conditions on uniqueness).
  let updated = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const englishName = englishNames[i] ?? item.name;
    const newSlug = await uniqueSlug({
      base: englishName,
      table: "destinations",
      excludeId: item.id,
      supabase: admin,
    });
    if (newSlug !== item.slug) {
      await admin.from("destinations").update({ slug: newSlug }).eq("id", item.id);
      await insertSlugRedirect({ entityType: "destination", oldSlug: item.slug, newSlug }).catch(() => {});
      updated++;
    }
  }

  revalidatePath("/admin/seo");
  revalidatePath("/admin/stops");
  redirect(`/admin/seo?bulk_result=ok&bulk_count=${updated}`);
}
