import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTourBySlug } from "@/lib/public/tour-detail";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { StructuredData } from "@/components/seo/StructuredData";
import { tourLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

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

export default async function TourPage({ params }: PageProps) {
  const tour = await getTourBySlug(params.slug);
  if (!tour) notFound();

  const price =
    tour.price_cents !== null
      ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: tour.currency }).format(
          tour.price_cents / 100,
        )
      : null;

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
    <main className="min-h-screen bg-brand-navy text-brand-cream px-5 py-12 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{tour.name}</h1>
      {tour.tagline && (
        <p className="text-xl text-brand-orange">{tour.tagline}</p>
      )}
      <div className="flex gap-4 text-sm text-brand-cream/60">
        {tour.duration_hours !== null && <span>{tour.duration_hours}h</span>}
        {price && <span>{price}</span>}
      </div>
      {tour.description && (
        <p className="text-brand-cream/80 leading-relaxed">{tour.description}</p>
      )}
    </main>
    </>
  );
}
