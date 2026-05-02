import type { Metadata } from "next";
import Link from "next/link";
import { getPublicStops } from "@/lib/public/stops-list";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { getUiStrings, t, tpl } from "@/lib/i18n/ui";
import PublicNav from "@/components/public/PublicNav";
import StopsListClient from "@/components/public/StopsListClient";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const [s, { stops }] = await Promise.all([getUiStrings(), getPublicStops()]);
  const totalCount = stops.length;

  const baseTitle = t(s, "public.stops.meta.title", "Things to do in Amsterdam");
  const title = `${baseTitle} · ${SITE.name}`;
  const description = tpl(
    t(
      s,
      "public.stops.meta.description",
      "Browse {count} hand-picked Amsterdam stops — canals, markets, museums, and hidden gems. All free to explore on your Schiphol layover.",
    ),
    { count: totalCount },
  );
  const ogImage = ogImageFor({ title: baseTitle, subtitle: SITE.name });

  return {
    title,
    description,
    alternates: {
      canonical: canonicalFor("/stops"),
      languages: langAlternates("/stops"),
    },
    openGraph: {
      title,
      description,
      url: canonicalFor("/stops"),
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

export default async function StopsPage() {
  const locale = resolveLocale();
  const [s, { stops, categories }] = await Promise.all([
    getUiStrings(),
    getPublicStops(),
  ]);

  const totalCount = stops.length;

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream">
      <PublicNav
        locale={locale}
        langLabel={t(s, "auth.select_language", "Select language")}
      />

      <div className="pt-24 pb-16 px-5 max-w-7xl mx-auto">
        <header className="space-y-3 mb-8">
          <Link
            href="/"
            className="inline-block text-xs text-warm-cream/40 hover:text-legend-gold transition-colors"
          >
            {t(s, "public.stops.back", "← Back to home")}
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            {t(s, "public.stops.title", "Destinations")}
          </h1>
          <p className="text-warm-cream/60 text-lg max-w-2xl">
            {tpl(
              t(
                s,
                "public.stops.subtitle",
                "Browse all {count} Amsterdam stops — free to explore on your layover.",
              ),
              { count: totalCount },
            )}
          </p>
        </header>

        <StopsListClient
          stops={stops}
          categories={categories}
          labels={s}
          totalCount={totalCount}
        />
      </div>
    </main>
  );
}
