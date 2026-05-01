import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTourBySlug } from "@/lib/public/tour-detail";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tour = await getTourBySlug(params.slug);
  if (!tour) return { title: "Not found" };

  const title = tour.meta_title || `${tour.name} · LayoverAmsterdam`;
  const description =
    tour.meta_description ||
    tour.description ||
    tour.tagline ||
    `${tour.name} — a curated Amsterdam layover experience.`;

  return {
    title,
    description,
    openGraph: {
      title: tour.meta_title || tour.name,
      description: tour.meta_description || tour.description || tour.tagline || undefined,
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
  );
}
