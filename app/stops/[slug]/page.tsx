import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStopBySlug } from "@/lib/public/stop-detail";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stop = await getStopBySlug(params.slug);
  if (!stop) return { title: "Not found" };

  const title = stop.meta_title || `${stop.name} · LayoverAmsterdam`;
  const description =
    stop.meta_description ||
    stop.description ||
    `${stop.name} in ${stop.area || "Amsterdam"} — discover it on your Schiphol layover.`;

  return {
    title,
    description,
    openGraph: {
      title: stop.meta_title || stop.name,
      description: stop.meta_description || stop.description || undefined,
      images: stop.primary_photo_url ? [stop.primary_photo_url] : undefined,
    },
  };
}

export default async function StopPage({ params }: PageProps) {
  const stop = await getStopBySlug(params.slug);
  if (!stop) notFound();

  return (
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
  );
}
