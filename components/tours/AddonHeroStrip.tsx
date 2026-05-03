import { Suspense } from "react";
import { getHeroAddons } from "@/lib/public/tour-addons";
import AddonHeroStripClient from "./AddonHeroStripClient";

type Props = {
  tourId: string;
  tourSlug: string;
  locale: string;
  labels: Record<string, string>;
};

export default async function AddonHeroStrip({ tourId, tourSlug, locale, labels }: Props) {
  const addons = await getHeroAddons(tourId, locale);
  if (addons.length === 0) return null;

  return (
    // Suspense required because AddonHeroStripClient uses useSearchParams
    <Suspense fallback={null}>
      <AddonHeroStripClient addons={addons} tourSlug={tourSlug} labels={labels} />
    </Suspense>
  );
}
