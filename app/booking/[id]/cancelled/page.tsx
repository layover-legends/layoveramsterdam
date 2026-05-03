import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function BookingCancelledPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const admin = createAdminClient();
  const { data: rawBooking } = await admin
    .from("bookings")
    .select("id, user_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!rawBooking || (rawBooking as { user_id: string }).user_id !== user.id) {
    notFound();
  }

  const labels = await getUiStrings();

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-5 py-12">
      <div className="max-w-xl mx-auto space-y-8 text-center">
        <div className="text-5xl">✕</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t(labels, "checkout.cancelled.title", "Payment cancelled")}
        </h1>
        <p className="text-warm-cream/60 text-sm">
          No charge was made. Your booking is still saved.
        </p>
        <Link
          href={`/booking/${params.id}/review`}
          className="inline-block px-8 py-3.5 rounded-full bg-legend-gold text-ink-black font-semibold tracking-wide hover:bg-gold-light transition-colors"
        >
          {t(labels, "checkout.cancelled.retry", "Try again →")}
        </Link>
      </div>
    </main>
  );
}
