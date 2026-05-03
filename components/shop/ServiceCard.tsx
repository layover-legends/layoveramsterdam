"use client";

import Link from "next/link";
import Image from "next/image";
import type { PublicService } from "@/lib/public/shop";
import { formatPrice } from "@/lib/i18n/format-price";
import { t } from "@/lib/i18n/t";
import ComingSoonForm from "./ComingSoonForm";
import AddToCartButton from "./AddToCartButton";

const CATEGORY_ICONS: Record<string, string> = {
  photo: "📷",
  connectivity: "📡",
  mobility: "🚲",
  tickets: "🎟",
  food: "🥐",
  comfort: "🧳",
  souvenir: "🎁",
  premium: "⭐",
};

type Props = {
  service: PublicService;
  labels: Record<string, string>;
};

export default function ServiceCard({ service, labels }: Props) {
  const icon = CATEGORY_ICONS[service.category] ?? "●";
  const isComingSoon = service.availability_status === "coming_soon";

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
        isComingSoon
          ? "border-warm-cream/10 bg-warm-cream/[0.02]"
          : "border-warm-cream/15 bg-warm-cream/[0.04] hover:border-warm-cream/25"
      }`}
    >
      {isComingSoon && (
        <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-warm-cream/20 text-warm-cream/40">
          {t(labels, "shop.coming_soon.badge", "Coming soon")}
        </span>
      )}

      {/* Thumbnail */}
      {service.image_url && (
        <div className="rounded-xl overflow-hidden aspect-video -mx-1">
          <Image
            src={service.image_url}
            alt={service.name}
            width={400}
            height={225}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Header */}
      <div className="space-y-1 pr-24">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{icon}</span>
          <h3 className="font-display font-semibold text-warm-cream text-base leading-snug">
            <Link href={`/shop/${service.slug}`} className="hover:text-legend-gold transition-colors">
              {service.name}
            </Link>
          </h3>
        </div>
        {service.short_blurb && (
          <p className="text-sm text-warm-cream/60 line-clamp-2">{service.short_blurb}</p>
        )}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="font-display font-semibold text-legend-gold text-lg">
          {formatPrice(service.price_cents, "EUR")}
        </span>
        {service.pricing_model === "per_person" && (
          <span className="text-xs text-warm-cream/40">
            {t(labels, "tour.addons.per_person", "/ person")}
          </span>
        )}
      </div>

      {/* CTA */}
      {isComingSoon ? (
        <ComingSoonForm serviceId={service.id} labels={labels} />
      ) : (
        <AddToCartButton addonSlug={service.slug} labels={labels} />
      )}
    </div>
  );
}
