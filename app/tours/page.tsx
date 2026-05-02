import Link from "next/link";
import type { Metadata } from "next";
import { getAllTours } from "@/lib/public/featured-tours";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { getUiStrings, t } from "@/lib/i18n/ui";
import TourCard from "@/components/public/TourCard";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await getUiStrings();
  const title = t(s, "tours.index.title", "All Tours") + " · " + SITE.name;
  const description = t(s, "tours.index.subtitle", "Premium layover experiences between your flights at Amsterdam Schiphol.");
  const ogImage = ogImageFor({ title: t(s, "tours.index.title", "All Tours"), subtitle: SITE.name });
  return {
    title,
    description,
    alternates: { canonical: canonicalFor("/tours"), languages: langAlternates("/tours") },
    openGraph: {
      title,
      description,
      url: canonicalFor("/tours"),
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

export default async function ToursPage() {
  const [tours, s] = await Promise.all([getAllTours(), getUiStrings()]);

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream">
      <div className="max-w-5xl mx-auto px-5 py-16 space-y-12">
        <header className="space-y-4 text-center">
          <Link
            href="/"
            className="inline-block text-xs text-warm-cream/40 hover:text-legend-gold transition-colors"
          >
            {t(s, "tours.index.back", "← Back to home")}
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            {t(s, "tours.index.title", "All Tours")}
          </h1>
          <p className="text-warm-cream/60 text-lg max-w-2xl mx-auto">
            {t(s, "tours.index.subtitle", "Premium layover experiences between your flights at Amsterdam Schiphol.")}
          </p>
        </header>

        {tours.length === 0 ? (
          <p className="text-center text-warm-cream/50 py-20">
            {t(s, "tours.index.empty", "No tours available yet. Check back soon.")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
