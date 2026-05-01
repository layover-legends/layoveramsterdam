import { createClient } from "@/lib/supabase/server";

export type PublicArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
};

export type PublicArticleFull = PublicArticle & {
  body_md: string;
};

const LIST_SELECT =
  "id, slug, title, excerpt, cover_url, meta_title, meta_description, published_at";

export async function listPublishedArticles(): Promise<PublicArticle[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select(LIST_SELECT)
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  return (data ?? []) as PublicArticle[];
}

export async function getArticleBySlug(slug: string): Promise<PublicArticleFull | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select(`${LIST_SELECT}, body_md`)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as PublicArticleFull | null) ?? null;
}

// Used by the sitemap — returns slugs + dates for all published articles.
export async function getPublishedArticleSlugs(): Promise<
  Array<{ slug: string; published_at: string | null }>
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  return (data ?? []) as Array<{ slug: string; published_at: string | null }>;
}
