import { notFound } from "next/navigation";
import Link from "next/link";
import { SmartImage } from "@/components/photos/SmartImage";
import type { Metadata } from "next";
import { getTourBySlug } from "@/lib/public/tour-detail";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { StructuredData } from "@/components/seo/StructuredData";
import { tourLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { createBooking } from "@/app/booking/actions";
import AddonHeroStrip from "@/components/tours/AddonHeroStrip";
import AdultGate from "@/components/booking/AdultGate";
import ReviewCard from "@/components/reviews/ReviewCard";
import { getUiStrings } from "@/lib/i18n/ui";
import { checkAdultConsent } from "@/lib/age-verification/verify";
import { getApprovedReviewsForTour, canUserReviewTour } from "@/lib/public/reviews";

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
  const [labels, adultVerified, reviewsData, userCanReview] = await Promise.all([
    getUiStrings(),
    tour.is_adult_only ? checkAdultConsent() : Promise.resolve(true),
    getApprovedReviewsForTour(tour.id, { limit: 5 }),
    canUserReviewTour(tour.id),
  ]);
  const { rows: reviews, total: reviewTotal } = reviewsData;

  return (
    <>
    <StructuredData data={[
      tourLd(tour, reviews.map(r => ({
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      }))),
      breadcrumbLd([
        { name: "Home", url: SITE.url },
        { name: "Tours", url: `${SITE.url}/tours` },
        { name: tour.name, url: canonicalFor(`/tours/${tour.slug}`) },
      ]),
    ]} />
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12 max-w-3xl mx-auto space-y-6">
      {tour.image_url && (
        <SmartImage
          fallbackUrl={tour.image_url}
          alt={tour.name}
          ratio="16:9"
          className="rounded-2xl aspect-video w-full"
          priority
        />
      )}
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{tour.name}</h1>
      {tour.tagline && (
        <p className="text-xl text-legend-gold">{tour.tagline}</p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-sm text-warm-cream/60">
        {tour.duration_hours !== null && <span>{tour.duration_hours}h</span>}
        {price && <span>{price}</span>}
        {tour.reviews_count > 0 && (
          <Link href={`/tours/${tour.slug}/reviews`}
            className="flex items-center gap-1.5 text-legend-gold hover:text-gold-light transition-colors">
            <span className="tracking-wider">
              {"★".repeat(Math.round(tour.avg_rating ?? 0))}{"☆".repeat(5 - Math.round(tour.avg_rating ?? 0))}
            </span>
            <span className="text-warm-cream/60 text-xs">
              {tour.avg_rating?.toFixed(1)} ({tour.reviews_count} review{tour.reviews_count !== 1 ? "s" : ""})
            </span>
          </Link>
        )}
      </div>
      {tour.description && (
        <p className="text-warm-cream/80 leading-relaxed">{tour.description}</p>
      )}

      {(() => {
        const bookingCta = (
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
        );

        const addons = (
          <AddonHeroStrip
            tourId={tour.id}
            tourSlug={tour.slug}
            locale={locale}
            labels={labels}
          />
        );

        if (tour.is_adult_only && !adultVerified) {
          return (
            <AdultGate labels={labels}>
              {addons}
              {bookingCta}
            </AdultGate>
          );
        }
        return <>{addons}{bookingCta}</>;
      })()}

      {/* ── Reviews section ──────────────────────────────────────────────── */}
      {(reviews.length > 0 || userCanReview) && (
        <section className="pt-8 border-t border-warm-cream/10 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">
              {tour.reviews_count > 0
                ? `${tour.reviews_count} review${tour.reviews_count !== 1 ? "s" : ""}`
                : "Reviews"}
            </h2>
            <div className="flex items-center gap-3">
              {reviewTotal > 5 && (
                <Link href={`/tours/${tour.slug}/reviews`}
                  className="text-sm text-legend-gold hover:text-gold-light transition-colors">
                  View all →
                </Link>
              )}
              {userCanReview && (
                <Link href={`/review/${tour.id}`}
                  className="px-4 py-2 rounded-full border border-legend-gold/40 text-legend-gold text-xs font-medium hover:bg-legend-gold/10 transition-colors">
                  Write a review
                </Link>
              )}
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r as unknown as Parameters<typeof ReviewCard>[0]["review"]} />
              ))}
              {reviewTotal > 5 && (
                <Link href={`/tours/${tour.slug}/reviews`}
                  className="block text-center py-3 rounded-2xl border border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5 text-sm transition-colors">
                  View all {reviewTotal} reviews →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-warm-cream/40">No reviews yet.</p>
          )}
        </section>
      )}
    </main>
    </>
  );
}
