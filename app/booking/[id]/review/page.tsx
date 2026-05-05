import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUiStrings, t } from "@/lib/i18n/ui";
import ReviewSummary from "@/components/booking/ReviewSummary";
import CheckoutButton from "@/components/booking/CheckoutButton";
import { getAllRatesList, countryToCurrency, getRate } from "@/lib/currency/fx";
import { parseCurrencyCookie, CURRENCY_COOKIE, formatPrice, formatEur } from "@/lib/currency/format";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { error?: string };
};

export default async function BookingReviewPage({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const admin = createAdminClient();

  const { data: rawBooking } = await admin
    .from("bookings")
    .select(
      "id, user_id, tour_id, party_size, base_cents, addons_cents, total_cents, currency, status, booking_addons(addon_id, qty, unit_price_cents, vat_rate)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!rawBooking || (rawBooking as { user_id: string }).user_id !== user.id) {
    notFound();
  }

  type BookingRow = {
    id: string;
    user_id: string;
    tour_id: string | null;
    party_size: number;
    base_cents: number;
    addons_cents: number;
    total_cents: number;
    currency: string;
    status: string;
    booking_addons: Array<{ addon_id: string; qty: number; unit_price_cents: number; vat_rate: number }>;
  };

  const booking = rawBooking as unknown as BookingRow;

  // Get tour info
  let tour: { name: string; slug: string } | null = null;
  if (booking.tour_id) {
    const { data } = await admin
      .from("tours")
      .select("name, slug")
      .eq("id", booking.tour_id)
      .maybeSingle();
    tour = data as { name: string; slug: string } | null;
  }

  // Get addon names for the summary
  type AddonInfo = { id: string; name: string | null };
  let addonMap = new Map<string, string>();
  if (booking.booking_addons.length > 0) {
    const ids = booking.booking_addons.map((ba) => ba.addon_id);
    const { data } = await admin.from("addons").select("id, name").in("id", ids);
    addonMap = new Map(
      ((data ?? []) as AddonInfo[]).map((a) => [a.id, a.name ?? "Add-on"]),
    );
  }

  // Resolve display currency for FX disclosure
  const cookieCurrency  = parseCurrencyCookie(cookies().get(CURRENCY_COOKIE)?.value);
  const geoCountry      = headers().get("x-vercel-ip-country") ?? null;
  const displayCurrency = cookieCurrency !== "EUR" ? cookieCurrency : countryToCurrency(geoCountry);
  const fxRate          = await getRate(displayCurrency);
  const showFxDisclosure = displayCurrency !== "EUR";

  const labels = await getUiStrings();
  const errorMsg = searchParams?.error;

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href={`/booking/${params.id}/addons`}
          className="inline-flex items-center gap-1 text-xs text-warm-cream/60 hover:text-legend-gold transition-colors"
        >
          ← {t(labels, "checkout.review.edit_addons", "Edit add-ons")}
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t(labels, "checkout.review.title", "Review your booking")}
        </h1>

        {errorMsg && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        <ReviewSummary
          tourName={tour?.name ?? null}
          partySize={booking.party_size}
          baseCents={booking.base_cents}
          currency={booking.currency}
          addonLines={booking.booking_addons.map((ba) => ({
            name: addonMap.get(ba.addon_id) ?? "Add-on",
            qty: ba.qty,
            unit_price_cents: ba.unit_price_cents,
            vat_rate: ba.vat_rate,
          }))}
          labels={labels}
        />

        {/* FX disclosure — shown when visitor's display currency != EUR */}
        {showFxDisclosure && (
          <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/3 px-5 py-4 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-warm-cream/70">
                {t(labels, "checkout.review.total", "Total")}
              </span>
              <span className="font-display text-xl font-semibold text-legend-gold">
                {formatPrice(booking.base_cents + booking.booking_addons.reduce((s, a) => s + a.unit_price_cents * a.qty, 0), fxRate)}
              </span>
            </div>
            <p className="text-xs text-warm-cream/40 text-right">
              {t(labels, "checkout.fx_disclosure",
                "Charged in EUR {eur} by Stripe. Your bank may apply FX fees."
              ).replace("{eur}", formatEur(booking.base_cents + booking.booking_addons.reduce((s, a) => s + a.unit_price_cents * a.qty, 0)))}
            </p>
          </div>
        )}

        <CheckoutButton bookingId={params.id} labels={labels} />

        <p className="text-center text-xs text-warm-cream/30">
          Booking ref: <span className="font-mono text-warm-cream/40">{booking.id}</span>
        </p>
      </div>
    </main>
  );
}
