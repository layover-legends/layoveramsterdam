// Client-safe types for articles CMS.
// MUST NOT import server-only modules.

export type Article = {
  id: string;
  city_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export const ARTICLE_FILTERS = [
  { key: "all",       label: "All" },
  { key: "published", label: "Published" },
  { key: "draft",     label: "Drafts" },
] as const;

export type ArticleFilter = (typeof ARTICLE_FILTERS)[number]["key"];
