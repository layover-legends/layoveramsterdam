import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTourBySlug } from "@/lib/public/tour-detail";
import { getApprovedReviewsForTour, canUserReviewTour } from "@/lib/public/reviews";
import { StructuredData } from "@/components/seo/StructuredData";
import ReviewCard from "@/components/reviews/ReviewCard";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE, canonicalFor } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "newest",  label: "Newest first" },
  { value: "oldest",  label: "Oldest first" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest",  label: "Lowest rating" },
  { value: "helpful", label: "Most helpful" },
];

type PageProps = {
  params: { slug: string };
  searchParams?: { page?: string; sort?: string; rating?: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tour = await getTourBySlug(params.slug);
  if (!tour) return { title: "Not found" };
  return {
    title: `Reviews: ${tour.name} · ${SITE.name}`,
    alternates: { canonical: canonicalFor(`/tours/${params.slug}/reviews`) },
  };
}

export default async function TourReviewsPage({ params, searchParams }: PageProps) {
  const locale = resolveLocale();
  const [tour, s] = await Promise.all([
    getTourBySlug(params.slug),
    loadUiStrings(locale),
  ]);
  if (!tour) notFound();

  const page       = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const sort       = searchParams?.sort ?? "newest";
  const ratingStr  = searchParams?.rating ?? "";
  const minRating  = /^[1-5]$/.test(ratingStr) ? Number(ratingStr) : undefined;
  const offset     = (page - 1) * PAGE_SIZE;

  const [{ rows: reviews, total }, userCanReview] = await Promise.all([
    getApprovedReviewsForTour(tour.id, { limit: PAGE_SIZE, offset, sort, minRating }),
    canUserReviewTour(tour.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(p: number, s?: string, r?: string) {
    const qs = new URLSearchParams();
    const so = s ?? sort; const ra = r ?? ratingStr;
    if (so !== "newest") qs.set("sort", so);
    if (ra) qs.set("rating", ra);
    if (p > 1) qs.set("page", String(p));
    const q = qs.toString();
    return q ? `/tours/${tour!.slug}/reviews?${q}` : `/tours/${tour!.slug}/reviews`;
  }

  // Schema.org Review collection
  const reviewsLd = reviews.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Reviews for ${tour.name}`,
    "url": canonicalFor(`/tours/${tour.slug}/reviews`),
    "itemListElement": reviews.map((r, i) => ({
      "@type": "ListItem",
      "position": offset + i + 1,
      "item": {
        "@type": "Review",
        "author": { "@type": "Person", "name": r.reviewer_name },
        "reviewRating": { "@type": "Rating", "ratingValue": r.rating, "bestRating": 5 },
        "reviewBody": r.comment ?? undefined,
        "datePublished": r.created_at.slice(0, 10),
      },
    })),
  } : null;

  return (
    <>
      {reviewsLd && <StructuredData data={[reviewsLd]} />}

      <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12 max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-warm-cream/50">
          <Link href="/" className="hover:text-warm-cream/80">Home</Link>
          <span>›</span>
          <Link href="/tours" className="hover:text-warm-cream/80">Tours</Link>
          <span>›</span>
          <Link href={`/tours/${tour.slug}`} className="hover:text-warm-cream/80">{tour.name}</Link>
          <span>›</span>
          <span className="text-warm-cream/70">Reviews</span>
        </nav>

        {/* Header */}
        <header className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">
            Reviews: {tour.name}
          </h1>
          {tour.reviews_count > 0 && tour.avg_rating && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-legend-gold tracking-wider text-lg">
                {"★".repeat(Math.round(tour.avg_rating))}{"☆".repeat(5 - Math.round(tour.avg_rating))}
              </span>
              <span className="text-warm-cream/60">
                {tour.avg_rating.toFixed(1)} average · {tour.reviews_count} verified review{tour.reviews_count !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </header>

        {/* Filters + sort */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Star filters */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-warm-cream/40 mr-1">Filter:</span>
            {[5,4,3,2,1].map((star) => (
              <Link key={star} href={buildHref(1, undefined, ratingStr === String(star) ? "" : String(star))}
                className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                  ratingStr === String(star)
                    ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                    : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
                }`}>
                {star}★
              </Link>
            ))}
          </div>

          {/* Sort */}
          <div className="ml-auto flex items-center gap-2 text-xs text-warm-cream/50">
            <span>Sort:</span>
            <select value={sort}
              onChange={() => {}} // handled by link navigation below
              className="bg-warm-cream/5 border border-warm-cream/15 text-warm-cream/70 px-2 py-1 rounded-lg text-xs"
              style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}
                  style={{ backgroundColor: "#0D0D0D" }}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="flex gap-1 ml-1">
              {SORT_OPTIONS.map((opt) => (
                <Link key={opt.value} href={buildHref(1, opt.value)}
                  className={`px-2 py-1 rounded text-[10px] transition-colors ${
                    sort === opt.value
                      ? "text-legend-gold"
                      : "text-warm-cream/30 hover:text-warm-cream/60"
                  }`}>
                  {opt.label.split(" ")[0]}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Write a review CTA */}
        {userCanReview && (
          <div className="rounded-2xl border border-legend-gold/20 bg-legend-gold/5 px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-warm-cream/80">You booked this tour — share your experience!</p>
            <Link href={`/review/${tour.id}`}
              className="shrink-0 px-5 py-2 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
              Write a review →
            </Link>
          </div>
        )}

        {/* Review list */}
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
            <p>No reviews match your filters.</p>
            {ratingStr && (
              <Link href={buildHref(1, undefined, "")} className="mt-2 block text-sm text-legend-gold">
                Clear filter →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r as unknown as Parameters<typeof ReviewCard>[0]["review"]} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-warm-cream/60">
            <span>Page {page} of {totalPages} · {total} reviews</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildHref(page - 1)}
                  className="px-4 py-2 rounded-full border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildHref(page + 1)}
                  className="px-4 py-2 rounded-full border border-warm-cream/15 hover:bg-warm-cream/5 transition-colors">
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-warm-cream/30 pt-4">
          All reviews are from verified bookings only. Reviews are moderated before publication.
        </p>
      </main>
    </>
  );
}
