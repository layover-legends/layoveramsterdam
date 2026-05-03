import type { Metadata } from "next";
import { getShopServices } from "@/lib/public/shop";
import { resolveLocale } from "@/lib/i18n/resolve";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { SITE } from "@/lib/seo/site";
import ShopGrid from "@/components/shop/ShopGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop · Layover Legends",
  description: "Standalone services for your Amsterdam layover: audio walks, photoshoots, eSIMs, bike rentals and more.",
  openGraph: {
    title: "Layover Legends Shop",
    description: "Standalone services for your Amsterdam layover",
    url: `${SITE.url}/shop`,
    siteName: SITE.name,
    type: "website",
  },
};

export default async function ShopPage() {
  const locale = resolveLocale();
  const [services, labels] = await Promise.all([
    getShopServices(locale),
    getUiStrings(),
  ]);

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t(labels, "shop.title", "Layover Legends Shop")}
          </h1>
          <p className="text-warm-cream/60 text-lg">
            {t(labels, "shop.subtitle", "Standalone services for your Amsterdam stay")}
          </p>
        </header>

        <ShopGrid services={services} labels={labels} />
      </div>
    </main>
  );
}
