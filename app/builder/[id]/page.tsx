import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE, canonicalFor } from "@/lib/seo/site";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { getBuilderDestinations } from "@/lib/public/builder-destinations";
import { getDefaultCityId } from "@/lib/public/city-helper";
import PublicNav from "@/components/public/PublicNav";
import BuilderClient from "@/components/builder/BuilderClient";
import { resolveLocale } from "@/lib/i18n/resolve";
import type { StoredRoute } from "@/lib/builder/types";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

type RouteRow = {
  id: string;
  city_id: string;
  layover_minutes: number;
  airport_buffer_minutes: number;
  transport_mode: string;
  stop_ids: string[];
  total_travel_minutes: number | null;
  total_visit_minutes: number | null;
  total_distance_meters: number | null;
  geometry_json: GeoJSON.Feature<GeoJSON.LineString> | null;
  legs_json: unknown;
  is_saved: boolean;
  share_slug: string | null;
  created_at: string;
};

async function getRoute(idOrSlug: string): Promise<StoredRoute | null> {
  const supabase = createClient();
  // Try by share_slug first, then by UUID
  const { data } = await supabase
    .from("custom_routes")
    .select("*")
    .or(`share_slug.eq.${idOrSlug},id.eq.${idOrSlug}`)
    .maybeSingle();

  if (!data) return null;
  const r = data as RouteRow;
  return {
    id: r.id,
    cityId: r.city_id,
    layoverMinutes: r.layover_minutes,
    airportBufferMinutes: r.airport_buffer_minutes,
    transportMode: r.transport_mode,
    stopIds: r.stop_ids,
    totalTravelMinutes: r.total_travel_minutes,
    totalVisitMinutes: r.total_visit_minutes,
    totalDistanceMeters: r.total_distance_meters,
    geometryJson: r.geometry_json,
    legsJson: r.legs_json as StoredRoute["legsJson"],
    isSaved: r.is_saved,
    shareSlug: r.share_slug,
    createdAt: r.created_at,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const title = "Shared Layover Route · " + SITE.name;
  return {
    title,
    openGraph: { title, url: canonicalFor(`/builder/${params.id}`) },
  };
}

export default async function SharedRoutePage({ params }: PageProps) {
  const locale = resolveLocale();
  const [route, s, { stops, categories }, cityId] = await Promise.all([
    getRoute(params.id),
    getUiStrings(),
    getBuilderDestinations(),
    getDefaultCityId(),
  ]);

  if (!route) notFound();

  return (
    <>
      <PublicNav locale={locale} langLabel={t(s, "auth.select_language", "Select language")} />
      <main className="min-h-screen bg-ink-black text-warm-cream pt-20 pb-8 px-5">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-3 pt-4">
            <Link href="/builder" className="text-xs text-warm-cream/40 hover:text-legend-gold transition-colors">
              ← Build your own
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Shared Layover Route
            </h1>
            <p className="text-warm-cream/50 text-sm">
              {route.stopIds.length} stops · {route.layoverMinutes} min layover
            </p>
          </header>

          <BuilderClient
            destinations={stops}
            categories={categories}
            labels={s}
            cityId={cityId ?? route.cityId}
            initialLayoverMinutes={route.layoverMinutes}
            initialStopIds={route.stopIds}
          />
        </div>
      </main>
    </>
  );
}
