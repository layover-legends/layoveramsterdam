import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getShopServiceBySlug } from "@/lib/public/shop";
import { resolveLocale } from "@/lib/i18n/resolve";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { formatPrice } from "@/lib/i18n/format-price";
import { SITE } from "@/lib/seo/site";
import ComingSoonForm from "@/components/shop/ComingSoonForm";
import AddToCartButton from "@/components/shop/AddToCartButton";

export const revalidate = 60;

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocale();
  const service = await getShopServiceBySlug(params.slug, locale);
  if (!service) return { title: "Not found" };

  return {
    title: `${service.name} · Layover Legends`,
    description: service.short_blurb ?? service.description ?? service.name,
    openGraph: {
      title: service.name,
      description: service.short_blurb ?? undefined,
      url: `${SITE.url}/shop/${service.slug}`,
      siteName: SITE.name,
    },
  };
}

export default async function ShopSlugPage({ params }: PageProps) {
  const locale = resolveLocale();
  const [service, labels] = await Promise.all([
    getShopServiceBySlug(params.slug, locale),
    getUiStrings(),
  ]);

  if (!service) notFound();

  const isComingSoon = service.availability_status === "coming_soon";

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-xs text-warm-cream/60 hover:text-legend-gold transition-colors mb-6"
        >
          ← <span>{t(labels, "public.shop.back_to_shop", "Back to shop")}</span>
        </Link>

        {service.image_url && (
          <div className="rounded-2xl overflow-hidden aspect-video w-full">
            <Image
              src={service.image_url}
              alt={service.name}
              width={1200}
              height={675}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        )}

        <header className="space-y-3">
          {isComingSoon && (
            <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-warm-cream/20 text-warm-cream/50">
              {t(labels, "shop.coming_soon.label", "Coming soon")}
            </span>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {service.name}
          </h1>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-semibold text-legend-gold text-2xl">
              {formatPrice(service.price_cents, "EUR")}
            </span>
            {service.pricing_model === "per_person" && (
              <span className="text-sm text-warm-cream/50">
                {t(labels, "tour.addons.per_person", "/ person")}
              </span>
            )}
          </div>
        </header>

        {service.description && (
          <p className="text-warm-cream/75 leading-relaxed">{service.description}</p>
        )}

        <div className="pt-2">
          {isComingSoon ? (
            <div className="space-y-3">
              <p className="text-sm text-warm-cream/60">
                {t(labels, "shop.coming_soon.label", "Coming soon")} — get notified when it launches.
              </p>
              <ComingSoonForm serviceId={service.id} labels={labels} />
            </div>
          ) : (
            <AddToCartButton addonSlug={service.slug} labels={labels} />
          )}
        </div>
      </div>
    </main>
  );
}
