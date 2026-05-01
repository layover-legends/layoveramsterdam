import { createClient } from "@/lib/supabase/server";
import type { Article, ArticleFilter } from "@/lib/admin/articles-types";

export type { Article, ArticleFilter } from "@/lib/admin/articles-types";
export { ARTICLE_FILTERS } from "@/lib/admin/articles-types";

const PAGE_SIZE = 25;

const ARTICLE_SELECT =
  "id, slug, title, excerpt, body_md, cover_url, meta_title, meta_description, is_published, published_at, author_id, created_at, updated_at";

export type ArticlesListResult = {
  rows: Article[];
  totalMatching: number;
  page: number;
  pageSize: number;
  filterCounts: Record<ArticleFilter, number>;
};

export async function listArticles({
  filter = "all",
  search = "",
  page = 1,
}: {
  filter?: ArticleFilter;
  search?: string;
  page?: number;
} = {}): Promise<ArticlesListResult> {
  const supabase = createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("articles")
    .select(ARTICLE_SELECT, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filter === "published") q = q.eq("is_published", true);
  if (filter === "draft") q = q.eq("is_published", false);
  if (search.trim()) {
    q = q.or(`title.ilike.%${search.trim()}%,excerpt.ilike.%${search.trim()}%`);
  }

  const { data, count } = await q;

  const [allC, pubC, draftC] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("is_published", false),
  ]);

  return {
    rows: (data ?? []) as Article[],
    totalMatching: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    filterCounts: {
      all: allC.count ?? 0,
      published: pubC.count ?? 0,
      draft: draftC.count ?? 0,
    },
  };
}

export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("id", id)
    .maybeSingle();
  return (data as Article | null) ?? null;
}
