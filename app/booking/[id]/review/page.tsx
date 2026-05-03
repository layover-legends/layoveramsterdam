import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

export default async function BookingReviewPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const admin = createAdminClient();
  const { data: rawBooking } = await admin
    .from("bookings")
    .select(
      "id, user_id, party_size, base_cents, addons_cents, total_cents, currency, tours(name, slug)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!rawBooking || (rawBooking as { user_id: string }).user_id !== user.id) {
    notFound();
  }

  const b = rawBooking as unknown as {
    id: string;
    user_id: string;
    party_size: number;
    base_cents: number;
    addons_cents: number;
    total_cents: number;
    currency: string;
    tours: { name: string; slug: string } | null;
  };

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="space-y-2">
          <Link
            href={`/booking/${params.id}/addons`}
            className="text-sm text-warm-cream/50 hover:text-warm-cream/80 transition-colors"
          >
            ← Back to add-ons
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Almost there
          </h1>
        </header>

        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-5 py-4">
          <p className="text-sm text-amber-200/80">
            Payment integration is coming next week. Your booking is saved as a draft.
          </p>
        </div>

        <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 p-6 space-y-4">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-warm-cream/50">Tour</dt>
              <dd className="font-medium text-warm-cream">{b.tours?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-cream/50">Party size</dt>
              <dd className="font-medium text-warm-cream">{b.party_size}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-cream/50">Tour price</dt>
              <dd className="font-mono text-warm-cream">{formatMoney(b.base_cents, b.currency)}</dd>
            </div>
            {b.addons_cents > 0 && (
              <div className="flex justify-between">
                <dt className="text-warm-cream/50">Add-ons</dt>
                <dd className="font-mono text-warm-cream">
                  {formatMoney(b.addons_cents, b.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-warm-cream/10">
              <dt className="font-semibold text-warm-cream">Total</dt>
              <dd className="font-display font-semibold text-legend-gold text-xl">
                {formatMoney(b.total_cents, b.currency)}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-warm-cream/30 font-mono pt-1">Booking ref: {b.id}</p>
        </div>

        <Link
          href="/account"
          className="block text-center text-sm text-warm-cream/50 hover:text-warm-cream/80 transition-colors"
        >
          View saved bookings →
        </Link>
      </div>
    </main>
  );
}
