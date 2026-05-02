"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { autoTranslateEntity } from "@/lib/i18n/auto-translate";

const MAX_TITLE = 200;
const MAX_EXCERPT = 280;
const MAX_META_TITLE = 70;
const MAX_META_DESCRIPTION = 160;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Parsed = {
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  published_at: string | null;
};

function parseArticle(
  formData: FormData,
): { ok: true; data: Parsed } | { ok: false; error: string } {
  const title = (formData.get("title") || "").toString().trim();
  if (!title || title.length > MAX_TITLE)
    return { ok: false, error: `Title is required (1–${MAX_TITLE} characters).` };

  const slugRaw = (formData.get("slug") || "").toString().trim();
  const slug = slugRaw ? slugify(slugRaw) : slugify(title);
  if (!slug) return { ok: false, error: "Could not generate a slug from this title." };

  const excerpt = (formData.get("excerpt") || "").toString().trim() || null;
  if (excerpt && excerpt.length > MAX_EXCERPT)
    return { ok: false, error: `Excerpt must be ${MAX_EXCERPT} characters or fewer.` };

  const body_md = (formData.get("body_md") || "").toString();
  if (!body_md.trim()) return { ok: false, error: "Article body is required." };

  const cover_url = (formData.get("cover_url") || "").toString().trim() || null;

  const meta_title = (formData.get("meta_title") || "").toString().trim() || null;
  if (meta_title && meta_title.length > MAX_META_TITLE)
    return { ok: false, error: `Meta title must be ${MAX_META_TITLE} chars or fewer.` };

  const meta_description = (formData.get("meta_description") || "").toString().trim() || null;
  if (meta_description && meta_description.length > MAX_META_DESCRIPTION)
    return { ok: false, error: `Meta description must be ${MAX_META_DESCRIPTION} chars or fewer.` };

  const is_published = formData.get("is_published") === "on";
  const published_at = is_published ? new Date().toISOString() : null;

  return { ok: true, data: { slug, title, excerpt, body_md, cover_url, meta_title, meta_description, is_published, published_at } };
}

export async function createArticle(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = parseArticle(formData);
  if (!parsed.ok) redirect(`/admin/articles/new?error=${encodeURIComponent(parsed.error)}`);

  const supabase = createClient();

  // Slug uniqueness check.
  const { count } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("slug", parsed.data.slug);
  if ((count ?? 0) > 0)
    redirect(`/admin/articles/new?error=${encodeURIComponent("Slug already in use — choose a different title or edit the slug.")}`);

  const { data: inserted, error } = await supabase
    .from("articles")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !inserted)
    redirect(`/admin/articles/new?error=${encodeURIComponent(error?.message ?? "Could not create article.")}`);

  // Auto-translate the new article into all non-EN locales via DeepL.
  let translateStatus = "ok";
  try {
    const r = await autoTranslateEntity("article", inserted.id, {
      triggeredBy: admin.id,
      triggerSource: "admin_save",
    });
    if (!r.ok) translateStatus = "partial";
  } catch {
    translateStatus = "failed";
  }

  revalidatePath("/admin/articles");
  revalidatePath("/blog");
  redirect(`/admin/articles/${inserted.id}?saved=1&i18n=${translateStatus}`);
}

export async function updateArticle(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = parseArticle(formData);
  if (!parsed.ok) redirect(`/admin/articles/${id}?error=${encodeURIComponent(parsed.error)}`);

  const supabase = createClient();

  // Slug uniqueness — allow same slug on same article.
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("id", id)
    .maybeSingle();
  if (existing)
    redirect(`/admin/articles/${id}?error=${encodeURIComponent("Slug already used by another article.")}`);

  // Preserve published_at if article was already published.
  const { data: current } = await supabase
    .from("articles")
    .select("is_published, published_at")
    .eq("id", id)
    .maybeSingle();

  let published_at = parsed.data.published_at;
  if (parsed.data.is_published && current?.is_published && current.published_at) {
    published_at = current.published_at; // don't reset the original publish date
  }

  const { error } = await supabase
    .from("articles")
    .update({ ...parsed.data, published_at })
    .eq("id", id);
  if (error)
    redirect(`/admin/articles/${id}?error=${encodeURIComponent("Save failed: " + error.message)}`);

  // Re-translate any fields whose source actually changed (source_hash check
  // inside autoTranslateEntity skips fresh AI rows automatically).
  let translateStatus = "ok";
  try {
    const r = await autoTranslateEntity("article", id, {
      triggeredBy: admin.id,
      triggerSource: "admin_save",
    });
    if (!r.ok) translateStatus = "partial";
  } catch {
    translateStatus = "failed";
  }

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/blog");
  revalidatePath(`/blog/${parsed.data.slug}`);
  redirect(`/admin/articles/${id}?saved=1&i18n=${translateStatus}`);
}

export async function deleteArticle(id: string) {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error)
    redirect(`/admin/articles/${id}?error=${encodeURIComponent("Delete failed: " + error.message)}`);

  revalidatePath("/admin/articles");
  revalidatePath("/blog");
  redirect("/admin/articles?deleted=1");
}
