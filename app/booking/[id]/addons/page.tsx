import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTourAddons } from "@/lib/public/tour-addons";
import { getShopServices } from "@/lib/public/shop";
import { getUiStrings } from "@/lib/i18n/ui";
import { resolveLocale } from "@/lib/i18n/resolve";
import AddonStepClient from "@/components/booking/AddonStepClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function BookingAddonsPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const admin = createAdminClient();

  const { data: rawBooking } = await admin
    .from("bookings")
    .select(
      "id, user_id, tour_id, party_size, base_cents, total_cents, currency, status, booking_addons(addon_id)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!rawBooking || (rawBooking as { user_id: string }).user_id !== user.id) {
    notFound();
  }

  const booking = rawBooking as {
    id: string;
    user_id: string;
    tour_id: string | null;
    party_size: number;
    base_cents: number;
    total_cents: number;
    currency: string;
    status: string;
    booking_addons: Array<{ addon_id: string }>;
  };

  const locale = resolveLocale();
  const currentAddonIds = new Set(booking.booking_addons.map((b) => b.addon_id));

  // Standalones-only booking (no tour)
  if (!booking.tour_id) {
    const [shopServices, labels] = await Promise.all([getShopServices(locale), getUiStrings()]);
    const currentSlugs = shopServices
      .filter((s) => currentAddonIds.has(s.id))
      .map((s) => s.slug);

    return (
      <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
        <div className="max-w-2xl mx-auto">
          <AddonStepClient
            bookingId={params.id}
            tourName={null}
            tourSlug={null}
            baseCents={0}
            partySize={booking.party_size}
            currency={booking.currency}
            addons={shopServices}
            initialSelectedSlugs={currentSlugs}
            labels={labels}
          />
        </div>
      </main>
    );
  }

  // Tour + addons booking
  const { data: rawTour } = await admin
    .from("tours")
    .select("id, name, slug, price_cents, currency, pricing_model")
    .eq("id", booking.tour_id)
    .maybeSingle();

  if (!rawTour) notFound();

  const tour = rawTour as {
    id: string;
    name: string;
    slug: string;
    price_cents: number;
    currency: string;
    pricing_model: string;
  };

  const [addons, labels] = await Promise.all([
    getTourAddons(booking.tour_id, locale),
    getUiStrings(),
  ]);

  const currentAddonSlugs = addons
    .filter((a) => currentAddonIds.has(a.id))
    .map((a) => a.slug);

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <AddonStepClient
          bookingId={params.id}
          tourName={tour.name}
          tourSlug={tour.slug}
          baseCents={booking.base_cents}
          partySize={booking.party_size}
          currency={booking.currency}
          addons={addons}
          initialSelectedSlugs={currentAddonSlugs}
          labels={labels}
        />
      </div>
    </main>
  );
}
