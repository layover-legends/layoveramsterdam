import { SITE, canonicalFor } from "@/lib/seo/site";
import type { PublicArticleFull } from "@/lib/public/articles";
import type { StopDetail } from "@/lib/public/stop-detail";
import type { TourDetail } from "@/lib/public/tour-detail";

const PUBLISHER = {
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: { "@type": "ImageObject", url: `${SITE.url}/og` },
} as const;

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/og`,
    sameAs: [
      "https://www.instagram.com/Layover Legends",
      "https://x.com/Layover Legends",
    ],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function articleLd(article: PublicArticleFull) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.cover_url ?? undefined,
    datePublished: article.published_at ?? undefined,
    dateModified: article.published_at ?? undefined,
    author: PUBLISHER,
    publisher: PUBLISHER,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalFor(`/blog/${article.slug}`) },
  };
}

export function touristAttractionLd(stop: StopDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: stop.name,
    description: stop.description ?? undefined,
    image: stop.primary_photo_url ?? undefined,
    url: canonicalFor(`/stops/${stop.slug}`),
    address: {
      "@type": "PostalAddress",
      addressLocality: stop.area ?? "Amsterdam",
      addressCountry: "NL",
    },
    ...(stop.latitude !== null && stop.longitude !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: stop.latitude, longitude: stop.longitude } }
      : {}),
  };
}

type ReviewForLd = {
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

/**
 * TouristTrip LD with optional aggregateRating + Review items.
 *
 * aggregateRating is only emitted when tour.reviews_count > 0 and
 * tour.avg_rating is non-null — Google penalises empty/zero rating markup.
 *
 * Pass `reviews` (top 5 approved) to include individual Review items,
 * which unlocks star snippets in search results.
 */
export function tourLd(
  tour: TourDetail,
  reviews: ReviewForLd[] = []
) {
  const offers =
    tour.price_cents !== null
      ? {
          "@type": "Offer",
          price: (tour.price_cents / 100).toFixed(2),
          priceCurrency: tour.currency,
        }
      : undefined;

  const reviewCount = tour.reviews_count ?? 0;
  const avgRating   = tour.avg_rating ?? null;
  const hasRating   = reviewCount > 0 && avgRating !== null;

  const reviewItems = reviews.map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.reviewer_name },
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    reviewBody:   r.comment ?? undefined,
    datePublished: r.created_at.slice(0, 10),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.name,
    description: tour.description ?? tour.tagline ?? undefined,
    url: canonicalFor(`/tours/${tour.slug}`),
    provider: PUBLISHER,
    ...(offers ? { offers } : {}),
    ...(tour.duration_hours
      ? { duration: `PT${Math.round(tour.duration_hours * 60)}M` }
      : {}),
    ...(hasRating ? {
      aggregateRating: {
        "@type":       "AggregateRating",
        ratingValue:   avgRating!.toFixed(1),
        reviewCount,
        bestRating:    5,
        worstRating:   1,
      },
    } : {}),
    ...(reviewItems.length > 0 ? { review: reviewItems } : {}),
  };
}

/** @deprecated Use tourLd(tour, reviews) — aggregateRating is now on TouristTrip. */
export function tourReviewsLd(
  tour: TourDetail,
  reviews: ReviewForLd[] = []
) {
  return tourLd(tour, reviews);
}
