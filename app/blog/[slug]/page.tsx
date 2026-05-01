import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/public/articles";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Not found" };

  const title = article.meta_title || `${article.title} · LayoverAmsterdam`;
  const description = article.meta_description || article.excerpt || undefined;

  return {
    title,
    description,
    openGraph: {
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt || undefined,
      images: article.cover_url ? [article.cover_url] : undefined,
      type: "article",
      publishedTime: article.published_at ?? undefined,
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
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const html = renderMarkdown(article.body_md);
  const date = fmt(article.published_at);

  return (
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
            ← Back to all articles
          </a>
        </footer>
      </div>
    </main>
  );
}
