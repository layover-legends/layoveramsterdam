import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE } from "@/lib/seo/site";
import ReviewSubmitForm from "@/components/reviews/ReviewSubmitForm";

export const dynamic = "force-dynamic";

type PageProps = { params: { token: string } };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Leave a review · ${SITE.name}`,
    robots: { index: false },
  };
}

export default async function ReviewTokenPage({ params }: PageProps) {
  const locale = resolveLocale();
  const [s, admin] = await Promise.all([
    loadUiStrings(locale),
    Promise.resolve(createAdminClient()),
  ]);

  // Validate token
  const { data: logRow } = await admin
    .from("review_request_log")
    .select("booking_id, completed_at")
    .eq("unique_token", params.token)
    .maybeSingle();

  if (!logRow) notFound();

  // Single-use — already completed
  if (logRow.completed_at) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ink-black text-warm-cream px-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-4xl">✓</p>
          <h1 className="font-display text-2xl font-semibold">
            {t(s, "review.already_submitted_h", "Review already submitted")}
          </h1>
          <p className="text-warm-cream/60">
            {t(s, "review.already_submitted_body", "You've already submitted a review for this booking. Thank you!")}
          </p>
        </div>
      </main>
    );
  }

  // Fetch booking + tour
  const { data: booking } = await admin
    .from("bookings")
    .select("id, user_id, tours(id, name), users(full_name, email)")
    .eq("id", logRow.booking_id)
    .maybeSingle();

  if (!booking) notFound();

  const tour = booking.tours as unknown as { id: string; name: string } | null;
  const user = booking.users as unknown as { full_name: string | null; email: string } | null;
  const tourId   = tour?.id ?? null;
  const tourName = tour?.name ?? "Your tour";
  const userName = user?.full_name ?? user?.email?.split("@")[0] ?? "Traveller";

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-6 py-12 max-w-xl mx-auto space-y-8">
      <header className="space-y-2">
        <p className="text-xs text-warm-cream/50 uppercase tracking-wide">Layover Legends</p>
        <h1 className="font-display text-3xl font-semibold">
          {t(s, "review.form_h1", "How was your tour, {name}?").replace("{name}", userName)}
        </h1>
        <p className="text-warm-cream/60 text-sm">{tourName}</p>
      </header>

      <ReviewSubmitForm
        token={params.token}
        bookingId={logRow.booking_id}
        tourId={tourId}
        userName={userName}
        tourName={tourName}
        labels={s}
      />
    </main>
  );
}
