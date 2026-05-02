import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBookingForUser } from "@/lib/public/booking-detail";
import { cancelBooking } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { cancelled?: string; error?: string };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

function formatDt(iso: string) {
  return new Intl.DateTimeFormat("en-NL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No-show",
};

const STATUS_COLOURS: Record<string, string> = {
  pending_payment: "bg-amber-400/15 text-amber-200",
  confirmed: "bg-emerald-400/15 text-emerald-200",
  in_progress: "bg-canal-blue/30 text-canal-light",
  completed: "bg-emerald-400/15 text-emerald-200",
  cancelled: "bg-warm-cream/10 text-warm-cream/50",
  refunded: "bg-warm-cream/10 text-warm-cream/50",
  no_show: "bg-red-400/15 text-red-200",
};

export default async function BookingPage({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/?auth_required=1");

  const booking = await getBookingForUser(params.id, user.id);
  if (!booking) notFound();

  const cancelled = searchParams?.cancelled === "1";
  const canCancel = ["pending_payment", "confirmed"].includes(booking.status);

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="space-y-2">
          <Link href="/tours" className="text-sm text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
            ← Back to tours
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Your booking
          </h1>
        </header>

        {cancelled && (
          <div role="status" className="rounded-xl border border-warm-cream/20 bg-warm-cream/5 px-4 py-3 text-sm text-warm-cream/80">
            Booking cancelled.
          </div>
        )}

        <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 divide-y divide-warm-cream/10">
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-warm-cream/40 mb-1">Tour</p>
              <Link
                href={`/tours/${booking.tour_slug}`}
                className="font-display text-xl font-semibold hover:text-legend-gold transition-colors"
              >
                {booking.tour_name}
              </Link>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOURS[booking.status] ?? "bg-warm-cream/10 text-warm-cream/60"}`}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
          </div>

          <dl className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-warm-cream/40 text-xs uppercase tracking-wider mb-0.5">Pickup</dt>
              <dd className="text-warm-cream font-medium">{formatDt(booking.scheduled_pickup_at)}</dd>
            </div>
            <div>
              <dt className="text-warm-cream/40 text-xs uppercase tracking-wider mb-0.5">Drop-off</dt>
              <dd className="text-warm-cream font-medium">{formatDt(booking.scheduled_dropoff_at)}</dd>
            </div>
            <div>
              <dt className="text-warm-cream/40 text-xs uppercase tracking-wider mb-0.5">Party size</dt>
              <dd className="text-warm-cream font-medium">{booking.party_size}</dd>
            </div>
            <div>
              <dt className="text-warm-cream/40 text-xs uppercase tracking-wider mb-0.5">Total</dt>
              <dd className="font-display text-legend-gold font-semibold text-lg">
                {formatMoney(booking.total_cents, booking.currency)}
              </dd>
            </div>
          </dl>

          <div className="px-6 py-5 space-y-3">
            <button
              disabled
              className="w-full py-3.5 rounded-full bg-legend-gold/30 text-legend-gold/50 font-semibold text-sm cursor-not-allowed"
            >
              Proceed to payment — coming in Phase 8
            </button>

            {canCancel && (
              <form
                action={async () => {
                  "use server";
                  await cancelBooking(params.id);
                }}
              >
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/60 text-sm hover:border-warm-cream/40 hover:text-warm-cream/80 transition-colors"
                >
                  Cancel booking
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-warm-cream/30">
          Booking ref: <span className="font-mono text-warm-cream/50">{booking.id}</span>
        </p>
      </div>
    </main>
  );
}
