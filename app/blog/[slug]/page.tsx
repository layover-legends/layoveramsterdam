import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/public/articles";
import { renderMarkdown } from "@/lib/markdown";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { StructuredData } from "@/components/seo/StructuredData";
import { articleLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Not found" };

  const locale = resolveLocale();
  const title = article.meta_title || `${article.title} · ${SITE.name}`;
  const description = article.meta_description || article.excerpt || undefined;
  const ogImage = article.cover_url ?? ogImageFor({ title: article.title });
  const path = `/blog/${params.slug}`;
  const canonical = canonicalFor(path);

  return {
    title,
    description,
    alternates: { canonical, languages: langAlternates(path) },
    openGraph: {
      title: article.meta_title || article.title,
      description,
      url: canonical,
      siteName: SITE.name,
      type: "article",
      locale: OG_LOCALE[locale],
      publishedTime: article.published_at ?? undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      creator: SITE.twitter,
      title,
      description,
      images: [ogImage],
    },
  };
}

function fmt(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogArticlePage({ params }: PageProps) {
  const [article, s] = await Promise.all([getArticleBySlug(params.slug), getUiStrings()]);
  if (!article) notFound();

  const html = renderMarkdown(article.body_md);
  const date = fmt(article.published_at);

  return (
    <>
    <StructuredData data={[
      articleLd(article),
      breadcrumbLd([
        { name: "Home", url: SITE.url },
        { name: "Blog", url: `${SITE.url}/blog` },
        { name: article.title, url: canonicalFor(`/blog/${article.slug}`) },
      ]),
    ]} />
    <main className="min-h-screen bg-brand-navy text-brand-cream">
      {article.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover_url}
          alt={article.title}
          className="w-full max-h-72 sm:max-h-96 object-cover"
        />
      )}

      <div className="max-w-3xl mx-auto px-5 py-12 space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-lg text-brand-cream/70 leading-relaxed">{article.excerpt}</p>
          )}
          {date && (
            <time className="block text-sm text-brand-cream/40">{date}</time>
          )}
        </header>

        {/* Sanitized markdown rendered as HTML */}
        <article
          className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-brand-orange prose-a:no-underline hover:prose-a:underline prose-code:text-brand-orange/90 prose-code:bg-brand-cream/5 prose-code:px-1 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <footer className="pt-8 border-t border-brand-cream/10">
          <a
            href="/blog"
            className="text-sm text-brand-cream/50 hover:text-brand-orange transition-colors"
          >
            {t(s, "blog.back", "← Back to all articles")}
          </a>
        </footer>
      </div>
    </main>
    </>
  );
}
