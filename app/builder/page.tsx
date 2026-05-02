import type { Metadata } from "next";
import Link from "next/link";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { getBuilderDestinations } from "@/lib/public/builder-destinations";
import { getDefaultCityId } from "@/lib/public/city-helper";
import PublicNav from "@/components/public/PublicNav";
import BuilderClient from "@/components/builder/BuilderClient";
import { MIN_LAYOVER_MINUTES, MAX_LAYOVER_MINUTES } from "@/lib/builder/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await getUiStrings();
  const title = t(s, "public.builder.title", "Build Your Layover") + " · " + SITE.name;
  const description = t(
    s,
    "public.builder.subtitle",
    "Choose your layover duration, pick Amsterdam stops, and we'll plan the perfect route between your flights.",
  );
  const ogImage = ogImageFor({ title: "Build Your Layover", subtitle: "Custom Amsterdam route planner" });
  return {
    title,
    description,
    alternates: { canonical: canonicalFor("/builder"), languages: langAlternates("/builder") },
    openGraph: {
      title,
      description,
      url: canonicalFor("/builder"),
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

type PageProps = {
  searchParams?: {
    layover?: string;
    stops?: string;
  };
};

function parseLayover(raw: string | undefined): number | undefined {
  if (!raw || raw === "auto") return undefined;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return undefined;
  return Math.max(MIN_LAYOVER_MINUTES, Math.min(MAX_LAYOVER_MINUTES, n));
}

export default async function BuilderPage({ searchParams }: PageProps) {
  const locale = resolveLocale();

  const [s, { stops, categories }, cityId] = await Promise.all([
    getUiStrings(),
    getBuilderDestinations(),
    getDefaultCityId(),
  ]);

  // URL param pre-fill
  const initialLayoverMinutes = parseLayover(searchParams?.layover);
  const initialStopIds = searchParams?.stops
    ? stops
        .filter((s) => searchParams.stops!.split(",").includes(s.slug))
        .map((s) => s.id)
    : undefined;

  return (
    <>
      <PublicNav locale={locale} langLabel={t(s, "auth.select_language", "Select language")} />
      <main className="min-h-screen bg-ink-black text-warm-cream pt-20 pb-8 px-5">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <header className="space-y-3 pt-4">
            <Link href="/" className="text-xs text-warm-cream/40 hover:text-legend-gold transition-colors">
              ← {t(s, "public.stops.back", "Back to home")}
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              {t(s, "public.builder.title", "Build Your Layover")}
            </h1>
            <p className="text-warm-cream/60 max-w-xl">
              {t(
                s,
                "public.builder.subtitle",
                "Choose your layover duration, pick Amsterdam stops, and we'll plan the perfect route between your flights.",
              )}
            </p>
          </header>

          {/* Builder */}
          <BuilderClient
            destinations={stops}
            categories={categories}
            labels={s}
            cityId={cityId ?? ""}
            initialLayoverMinutes={initialLayoverMinutes}
            initialStopIds={initialStopIds}
          />
        </div>
      </main>
    </>
  );
}
