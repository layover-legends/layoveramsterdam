import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUiStrings, t } from "@/lib/i18n/ui";
import SuccessPoller from "@/components/booking/SuccessPoller";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { session_id?: string };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

function formatDt(iso: string) {
  return new Intl.DateTimeFormat("en-NL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

export default async function BookingSuccessPage({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const admin = createAdminClient();

  const { data: rawBooking } = await admin
    .from("bookings")
    .select(
      "id, user_id, tour_id, party_size, total_cents, currency, status, scheduled_pickup_at, paid_at, receipt_url, stripe_session_id, tours(name, slug), users(email)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!rawBooking || (rawBooking as { user_id: string }).user_id !== user.id) {
    notFound();
  }

  const booking = rawBooking as unknown as {
    id: string;
    user_id: string;
    tour_id: string | null;
    party_size: number;
    total_cents: number;
    currency: string;
    status: string;
    scheduled_pickup_at: string;
    paid_at: string | null;
    receipt_url: string | null;
    stripe_session_id: string | null;
    tours: { name: string; slug: string } | null;
    users: { email: string } | null;
  };

  const labels = await getUiStrings();
  const isPaid = booking.status === "paid" || booking.status === "confirmed";
  const calendarUrl = `/api/booking/${params.id}/calendar.ics`;

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-xl mx-auto space-y-8">

        {!isPaid ? (
          // Webhook hasn't fired yet — show confirming state with auto-poll
          <SuccessPoller bookingId={params.id} />
        ) : (
          <>
            <header className="space-y-3 text-center">
              <div className="text-5xl">✓</div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                {t(labels, "checkout.success.title", "Booking confirmed")}
              </h1>
              {booking.users?.email && (
                <p className="text-warm-cream/60 text-sm">
                  {t(labels, "checkout.success.subtitle", "We've sent your confirmation to {email}").replace(
                    "{email}",
                    booking.users.email,
                  )}
                </p>
              )}
            </header>

            {/* Booking summary */}
            <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 p-6 space-y-3">
              {booking.tours?.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-warm-cream/50">Tour</span>
                  <span className="font-medium text-warm-cream">{booking.tours.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-warm-cream/50">Party size</span>
                <span className="text-warm-cream">{booking.party_size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-warm-cream/50">Pickup</span>
                <span className="text-warm-cream">{formatDt(booking.scheduled_pickup_at)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-warm-cream/10">
                <span className="font-semibold text-warm-cream">Total paid</span>
                <span className="font-display font-semibold text-legend-gold text-lg">
                  {formatMoney(booking.total_cents, booking.currency)}
                </span>
              </div>
              <p className="text-[10px] text-warm-cream/25 font-mono">Ref: {booking.id}</p>
            </div>

            {/* What's next */}
            <div className="space-y-4">
              <h2 className="font-semibold text-warm-cream">
                {t(labels, "checkout.success.what_now", "What's next?")}
              </h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-3 text-sm text-warm-cream/70">
                  <span className="text-legend-gold mt-0.5">1.</span>
                  {t(labels, "checkout.success.next_step1", "We'll meet you at Schiphol arrivals")}
                </li>
                <li className="flex items-start gap-3 text-sm text-warm-cream/70">
                  <span className="text-legend-gold mt-0.5">2.</span>
                  {t(labels, "checkout.success.next_step2", "Bring your passport for terminal access")}
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={calendarUrl}
                className="flex-1 text-center px-6 py-3 rounded-full border border-legend-gold/40 text-legend-gold text-sm font-medium hover:bg-legend-gold/10 transition-colors"
              >
                {t(labels, "checkout.success.add_to_calendar", "Add to calendar")}
              </a>
              {booking.receipt_url && (
                <a
                  href={booking.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-6 py-3 rounded-full border border-warm-cream/20 text-warm-cream/70 text-sm font-medium hover:text-warm-cream hover:border-warm-cream/40 transition-colors"
                >
                  View receipt →
                </a>
              )}
            </div>

            <Link
              href="/account"
              className="block text-center text-xs text-warm-cream/40 hover:text-warm-cream/70 transition-colors"
            >
              View all bookings →
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
