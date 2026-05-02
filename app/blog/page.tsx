import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedArticles } from "@/lib/public/articles";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await getUiStrings();
  const title = t(s, "blog.index.title", "Layover Guides") + " · Layover Legends";
  const description = t(s, "blog.index.description", "Amsterdam layover tips, canal walk guides, and everything you need to turn a Schiphol stopover into an unforgettable experience.");
  const ogImage = ogImageFor({ title: t(s, "blog.index.title", "Layover Guides"), subtitle: "Amsterdam tips & itineraries" });
  return {
    title,
    description,
    alternates: { canonical: canonicalFor("/blog"), languages: langAlternates("/blog") },
    openGraph: {
      title,
      description,
      url: canonicalFor("/blog"),
      siteName: SITE.name,
      type: "website",
      locale: OG_LOCALE[locale],
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
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
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const [articles, s] = await Promise.all([listPublishedArticles(), getUiStrings()]);

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream">
      <div className="max-w-5xl mx-auto px-5 py-16 space-y-12">
        <header className="space-y-3 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {t(s, "blog.index.title", "Layover Guides")}
          </h1>
          <p className="text-warm-cream/60 text-lg max-w-2xl mx-auto">
            {t(s, "blog.index.header_description", "Everything you need to make the most of your Amsterdam stopover.")}
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="text-center text-warm-cream/50 py-20">{t(s, "blog.empty", "No articles published yet.")}</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/blog/${a.slug}`}
                className="group flex flex-col rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03] overflow-hidden hover:border-legend-gold/30 hover:bg-warm-cream/[0.06] transition-colors"
              >
                {a.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.cover_url}
                    alt={a.title}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-legend-gold/10 flex items-center justify-center text-5xl">
                    ✍
                  </div>
                )}
                <div className="flex-1 flex flex-col p-5 gap-3">
                  <h2 className="font-bold text-warm-cream group-hover:text-legend-gold transition-colors line-clamp-2 leading-snug">
                    {a.title}
                  </h2>
                  {a.excerpt && (
                    <p className="text-sm text-warm-cream/60 line-clamp-3 flex-1">{a.excerpt}</p>
                  )}
                  {a.published_at && (
                    <time className="text-xs text-warm-cream/40 tabular-nums">
                      {fmt(a.published_at)}
                    </time>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
