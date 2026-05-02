import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/StructuredData";
import { organizationLd, websiteLd } from "@/lib/seo/jsonld";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { resolveLocale } from "@/lib/i18n/resolve";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { createLayover } from "@/app/layover/actions";
import PublicNav from "@/components/public/PublicNav";
import HeroFlightForm from "@/components/public/HeroFlightForm";
import SocialProofStats from "@/components/public/SocialProofStats";
import HowItWorks from "@/components/public/HowItWorks";
import FeaturedTours from "@/components/public/FeaturedTours";
import MapVisibilityGate from "@/components/public/MapVisibilityGate";
import ReviewsSection from "@/components/public/ReviewsSection";
import FinalCTA from "@/components/public/FinalCTA";
import { getDefaultCityId } from "@/lib/public/city-helper";
import { getHomepageStats } from "@/lib/public/homepage-stats";
import { getFeaturedTours } from "@/lib/public/featured-tours";
import { getMapStops } from "@/lib/public/map-stops";
import { getHomepageReviews } from "@/lib/public/homepage-reviews";

// Blueprint+ F2 — ISR: revalidate homepage data every 60 seconds
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await getUiStrings();
  const title = `${SITE.name} — Don't waste your layover.`;
  const description = t(
    s,
    "homepage.tagline",
    "Turn your Schiphol layover into a legend. Premium city tours between flights.",
  );
  const ogImage = ogImageFor({ title: SITE.name, subtitle: "Amsterdam Layover Tours" });
  return {
    title,
    description,
    alternates: { canonical: canonicalFor("/"), languages: langAlternates("/") },
    openGraph: {
      title,
      description,
      url: canonicalFor("/"),
      siteName: SITE.name,
      type: "website",
      locale: OG_LOCALE[locale],
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE.name }],
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

// Blueprint+ F3 — streaming server components: wrap slow sections in Suspense

async function FeaturedToursStream() {
  const tours = await getFeaturedTours();
  return <FeaturedTours tours={tours} />;
}

async function ReviewsStream() {
  const reviews = await getHomepageReviews();
  return <ReviewsSection reviews={reviews} />;
}

function TourCardsSkeleton() {
  return (
    <section className="py-20 px-5 border-t border-warm-cream/8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-warm-cream/8 bg-warm-cream/[0.03] h-80 animate-pulse" />
        ))}
      </div>
    </section>
  );
}

function ReviewsSkeleton() {
  return (
    <section className="py-20 px-5 border-t border-warm-cream/8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-warm-cream/8 bg-warm-cream/[0.03] h-48 animate-pulse" />
        ))}
      </div>
    </section>
  );
}

type HomePageProps = {
  searchParams?: {
    auth_error?: string;
    auth_required?: string;
    admin_only?: string;
  };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const locale = resolveLocale();

  // Fetch fast-path data in parallel; slow sections stream via Suspense
  const [cityId, stats, mapStops, s] = await Promise.all([
    getDefaultCityId(),
    getHomepageStats(),
    getMapStops(),
    getUiStrings(),
  ]);

  const authError = searchParams?.auth_error === "1";
  const authRequired = searchParams?.auth_required === "1";
  const adminOnly = searchParams?.admin_only === "1";

  return (
    <>
      <StructuredData data={[organizationLd(), websiteLd()]} />
      <PublicNav locale={locale} langLabel={t(s, "auth.select_language", "Select language")} />

      <main id="main">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          id="hero"
          className="relative min-h-[100dvh] flex flex-col justify-center px-5 pt-24 pb-12 overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(27,79,114,0.12) 0%, transparent 60%), " +
              "radial-gradient(ellipse at 80% 20%, rgba(201,150,58,0.06) 0%, transparent 50%), " +
              "#0D0D0D",
          }}
        >
          {/* Subtle grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(247,243,236,1) 1px, transparent 1px), linear-gradient(90deg, rgba(247,243,236,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative z-10 max-w-2xl mx-auto w-full space-y-8 text-center">
            {/* Auth error notices */}
            {(authError || authRequired || adminOnly) && (
              <div className="rounded-xl border border-legend-gold/20 bg-legend-gold/5 px-4 py-3 text-sm text-warm-cream/80 text-center">
                {authError && t(s, "homepage.auth_error", "Sign-in didn't complete. Please try again.")}
                {authRequired && !authError && t(s, "homepage.auth_required", "Please sign in to view your account.")}
                {adminOnly && !authError && !authRequired && t(s, "homepage.admin_only", "That area is for admins only.")}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-legend-gold font-semibold">
                Amsterdam Layover Tours
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
                Don&apos;t waste<br className="hidden sm:block" /> your layover.
              </h1>
              <p className="text-lg text-warm-cream/65 leading-relaxed">
                Tell us your flights. We&rsquo;ll show you what fits.
              </p>
            </div>

            <HeroFlightForm cityId={cityId} formAction={createLayover} />

            <p className="text-xs text-warm-cream/30">
              Already planned your layover?{" "}
              <Link href="/tours" className="text-legend-gold hover:text-gold-light underline underline-offset-2 transition-colors">
                Browse all tours →
              </Link>
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-warm-cream/20 animate-bounce">
            <div className="w-px h-8 bg-gradient-to-b from-warm-cream/20 to-transparent" />
            <svg width="10" height="6" fill="none" viewBox="0 0 10 6" aria-hidden>
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </section>

        {/* ── Social proof ───────────────────────────────────────────────── */}
        <SocialProofStats completedBookings={stats.completedBookings} />

        {/* ── How it works ───────────────────────────────────────────────── */}
        <HowItWorks />

        {/* ── Featured tours — Blueprint+ F3 streaming ───────────────────── */}
        <Suspense fallback={<TourCardsSkeleton />}>
          <FeaturedToursStream />
        </Suspense>

        {/* ── Map ────────────────────────────────────────────────────────── */}
        <section className="py-20 px-5 border-t border-warm-cream/8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-legend-gold font-semibold">
                {mapStops.length > 0 ? `${mapStops.length} stops across the city` : "The city is yours"}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                Every layover, packed with the best of Amsterdam
              </h2>
              <p className="text-sm text-warm-cream/55 max-w-lg mx-auto">
                Filter by category — and every one of them is free if you&apos;re not on a paid tour.
              </p>
            </div>
            <MapVisibilityGate stops={mapStops} />
          </div>
        </section>

        {/* ── Reviews — Blueprint+ F3 streaming ─────────────────────────── */}
        <Suspense fallback={<ReviewsSkeleton />}>
          <ReviewsStream />
        </Suspense>

        {/* ── Final CTA ──────────────────────────────────────────────────── */}
        <FinalCTA />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="px-5 py-10 border-t border-warm-cream/8 text-xs text-warm-cream/40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            {`© ${new Date().getFullYear()} Layover Legends. All rights reserved.`}
          </p>
          <nav className="flex items-center gap-4">
            <Link href="/legal/privacy" className="hover:text-warm-cream/70 transition-colors">Privacy</Link>
            <span aria-hidden>·</span>
            <Link href="/legal/terms" className="hover:text-warm-cream/70 transition-colors">Terms</Link>
            <span aria-hidden>·</span>
            <Link href="/legal/cancellation" className="hover:text-warm-cream/70 transition-colors">Cancellations</Link>
            <span aria-hidden>·</span>
            <Link href="/account" className="hover:text-warm-cream/70 transition-colors">Account</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
