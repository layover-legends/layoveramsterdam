import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublishedArticleSlugs } from "@/lib/public/articles";

const BASE = "https://layover-legends.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  const [destRes, tourRes, articles] = await Promise.all([
    supabase
      .from("destinations")
      .select("slug, updated_at")
      .eq("is_active", true)
      .eq("requires_booking", false),
    supabase
      .from("tours")
      .select("slug, updated_at")
      .eq("is_active", true),
    getPublishedArticleSlugs(),
  ]);

  const destinations: MetadataRoute.Sitemap = ((destRes.data ?? []) as Array<{ slug: string; updated_at: string | null }>).map(
    (d) => ({
      url: `${BASE}/stops/${d.slug}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  const tours: MetadataRoute.Sitemap = ((tourRes.data ?? []) as Array<{ slug: string; updated_at: string | null }>).map(
    (t) => ({
      url: `${BASE}/tours/${t.slug}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE}/blog/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  return [
    { url: BASE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/blog`, changeFrequency: "weekly", priority: 0.9 },
    ...articleEntries,
    ...tours,
    ...destinations,
  ];
}
