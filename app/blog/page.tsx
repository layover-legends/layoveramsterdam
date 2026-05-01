import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedArticles } from "@/lib/public/articles";
import { SITE, canonicalFor, ogImageFor } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const title = "Layover Guides · LayoverAmsterdam";
const description =
  "Amsterdam layover tips, canal walk guides, and everything you need to turn a Schiphol stopover into an unforgettable experience.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalFor("/blog") },
  openGraph: {
    title,
    description,
    url: canonicalFor("/blog"),
    siteName: SITE.name,
    type: "website",
    locale: SITE.locale,
    images: [{ url: ogImageFor({ title: "Layover Guides", subtitle: "Amsterdam tips & itineraries" }), width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    creator: SITE.twitter,
    title,
    description,
    images: [ogImageFor({ title: "Layover Guides", subtitle: "Amsterdam tips & itineraries" })],
  },
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const articles = await listPublishedArticles();

  return (
    <main className="min-h-screen bg-brand-navy text-brand-cream">
      <div className="max-w-5xl mx-auto px-5 py-16 space-y-12">
        <header className="space-y-3 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Layover Guides
          </h1>
          <p className="text-brand-cream/60 text-lg max-w-2xl mx-auto">
            Everything you need to make the most of your Amsterdam stopover.
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="text-center text-brand-cream/50 py-20">No articles published yet.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/blog/${a.slug}`}
                className="group flex flex-col rounded-2xl border border-brand-cream/10 bg-brand-cream/[0.03] overflow-hidden hover:border-brand-orange/30 hover:bg-brand-cream/[0.06] transition-colors"
              >
                {a.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.cover_url}
                    alt={a.title}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-brand-orange/10 flex items-center justify-center text-5xl">
                    ✍
                  </div>
                )}
                <div className="flex-1 flex flex-col p-5 gap-3">
                  <h2 className="font-bold text-brand-cream group-hover:text-brand-orange transition-colors line-clamp-2 leading-snug">
                    {a.title}
                  </h2>
                  {a.excerpt && (
                    <p className="text-sm text-brand-cream/60 line-clamp-3 flex-1">{a.excerpt}</p>
                  )}
                  {a.published_at && (
                    <time className="text-xs text-brand-cream/40 tabular-nums">
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
