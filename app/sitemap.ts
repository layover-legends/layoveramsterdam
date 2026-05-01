import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublishedArticleSlugs } from "@/lib/public/articles";
import { SITE } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  const [destRes, tourRes, articles] = await Promise.all([
    supabase
      .from("destinations")
      .select("slug, updated_at")
      .eq("is_active", true)
      .eq("requires_booking", false)
      .eq("is_adult_only", false), // exclude adult-only from public sitemap
    supabase
      .from("tours")
      .select("slug, updated_at")
      .eq("is_active", true),
    getPublishedArticleSlugs(),
  ]);

  type SlugRow = { slug: string; updated_at: string | null };

  const destinations: MetadataRoute.Sitemap = ((destRes.data ?? []) as SlugRow[]).map((d) => ({
    url: `${SITE.url}/stops/${d.slug}`,
    lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const tours: MetadataRoute.Sitemap = ((tourRes.data ?? []) as SlugRow[]).map((t) => ({
    url: `${SITE.url}/tours/${t.slug}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE.url}/blog/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  return [
    { url: SITE.url,          changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE.url}/blog`, changeFrequency: "weekly", priority: 0.9 },
    ...articleEntries,
    ...tours,
    ...destinations,
  ];
}
