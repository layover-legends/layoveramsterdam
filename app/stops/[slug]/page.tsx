import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStopBySlug } from "@/lib/public/stop-detail";
import { SITE, canonicalFor, ogImageFor } from "@/lib/seo/site";
import { StructuredData } from "@/components/seo/StructuredData";
import { touristAttractionLd, breadcrumbLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stop = await getStopBySlug(params.slug);
  if (!stop) return { title: "Not found" };

  const title = stop.meta_title || `${stop.name} · ${SITE.name}`;
  const description =
    stop.meta_description ||
    stop.description ||
    `${stop.name} in ${stop.area || "Amsterdam"} — discover it on your Schiphol layover.`;
  const ogImage = stop.primary_photo_url ?? ogImageFor({ title: stop.name, subtitle: stop.area ?? "Amsterdam" });
  const canonical = canonicalFor(`/stops/${params.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: stop.meta_title || stop.name,
      description,
      url: canonical,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
      images: [{ url: ogImage, width: 1200, height: 630, alt: stop.name }],
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

export default async function StopPage({ params }: PageProps) {
  const stop = await getStopBySlug(params.slug);
  if (!stop) notFound();

  return (
    <>
    <StructuredData data={[
      touristAttractionLd(stop),
      breadcrumbLd([
        { name: "Home", url: SITE.url },
        { name: stop.name, url: canonicalFor(`/stops/${stop.slug}`) },
      ]),
    ]} />
    <main className="min-h-screen bg-brand-navy text-brand-cream px-5 py-12 max-w-3xl mx-auto space-y-6">
      {stop.category_name && (
        <p className="text-xs uppercase tracking-wide text-brand-orange/80">
          {stop.category_name}
        </p>
      )}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{stop.name}</h1>
      {stop.area && (
        <p className="text-brand-cream/60">{stop.area}</p>
      )}
      {stop.primary_photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={stop.primary_photo_url}
          alt={stop.name}
          className="w-full rounded-2xl object-cover max-h-80"
        />
      )}
      {stop.description && (
        <p className="text-brand-cream/80 leading-relaxed">{stop.description}</p>
      )}
    </main>
    </>
  );
}
