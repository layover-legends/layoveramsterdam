import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTourBySlug } from "@/lib/public/tour-detail";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { StructuredData } from "@/components/seo/StructuredData";
import { tourLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { createBooking } from "@/app/booking/actions";
import AddonHeroStrip from "@/components/tours/AddonHeroStrip";
import { getUiStrings } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string }; searchParams?: { layover?: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tour = await getTourBySlug(params.slug);
  if (!tour) return { title: "Not found" };

  const locale = resolveLocale();
  const title = tour.meta_title || `${tour.name} · ${SITE.name}`;
  const description =
    tour.meta_description ||
    tour.description ||
    tour.tagline ||
    `${tour.name} — a curated Amsterdam layover experience.`;
  const ogImage = ogImageFor({ title: tour.name, subtitle: tour.tagline ?? "Amsterdam layover tour" });
  const path = `/tours/${params.slug}`;
  const canonical = canonicalFor(path);

  return {
    title,
    description,
    alternates: { canonical, languages: langAlternates(path) },
    openGraph: {
      title: tour.meta_title || tour.name,
      description,
      url: canonical,
      siteName: SITE.name,
      type: "website",
      locale: OG_LOCALE[locale],
      images: [{ url: ogImage, width: 1200, height: 630, alt: tour.name }],
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

export default async function TourPage({ params, searchParams }: PageProps) {
  const tour = await getTourBySlug(params.slug);
  if (!tour) notFound();

  const price =
    tour.price_cents !== null
      ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: tour.currency }).format(
          tour.price_cents / 100,
        )
      : null;

  const layoverId = searchParams?.layover ?? null;
  const locale = resolveLocale();
  const labels = await getUiStrings();

  return (
    <>
    <StructuredData data={[
      tourLd(tour),
      breadcrumbLd([
        { name: "Home", url: SITE.url },
        { name: "Tours", url: `${SITE.url}/tours` },
        { name: tour.name, url: canonicalFor(`/tours/${tour.slug}`) },
      ]),
    ]} />
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12 max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{tour.name}</h1>
      {tour.tagline && (
        <p className="text-xl text-legend-gold">{tour.tagline}</p>
      )}
      <div className="flex gap-4 text-sm text-warm-cream/60">
        {tour.duration_hours !== null && <span>{tour.duration_hours}h</span>}
        {price && <span>{price}</span>}
      </div>
      {tour.description && (
        <p className="text-warm-cream/80 leading-relaxed">{tour.description}</p>
      )}

      <AddonHeroStrip
        tourId={tour.id}
        tourSlug={tour.slug}
        locale={locale}
        labels={labels}
      />

      <div className="pt-4 border-t border-warm-cream/10 space-y-3">
        {layoverId ? (
          <form action={createBooking}>
            <input type="hidden" name="tour_id" value={tour.id} />
            <input type="hidden" name="layover_id" value={layoverId} />
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-legend-gold text-ink-black font-semibold tracking-wide hover:bg-gold-light active:bg-gold-dark transition-colors"
            >
              Book this tour →
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <Link
              href="/layover"
              className="inline-block px-8 py-3.5 rounded-full bg-legend-gold text-ink-black font-semibold tracking-wide hover:bg-gold-light transition-colors"
            >
              Enter your flights to book →
            </Link>
            <p className="text-xs text-warm-cream/40">
              Tell us your layover details and we&apos;ll check availability.
            </p>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
