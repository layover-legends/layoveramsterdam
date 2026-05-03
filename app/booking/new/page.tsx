import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPendingBooking } from "@/app/actions/booking";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

// This page is a server-side router: reads URL params → creates draft booking → redirects.
// It has no UI. If the user refreshes /booking/new, a new draft booking is created.
// Phase 8c will add idempotency via payment intent.
export default async function BookingNewPage({ searchParams }: PageProps) {
  const tourSlug = (searchParams?.tour as string | undefined) ?? "";
  const partySize = Math.max(1, Number(searchParams?.party ?? 1) || 1);
  const addonSlugs = ((searchParams?.addons as string | undefined) ?? "")
    .split(",")
    .filter(Boolean);

  if (!tourSlug) redirect("/tours");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(
      `/booking/new?tour=${tourSlug}&party=${partySize}${
        addonSlugs.length ? `&addons=${addonSlugs.join(",")}` : ""
      }`,
    );
    redirect(`/?auth_required=1&next=${next}`);
  }

  const result = await createPendingBooking({
    tourSlug,
    partySize,
    addonSlugs,
    userId: user.id,
  });

  if ("error" in result) {
    redirect(`/tours/${tourSlug}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/booking/${result.bookingId}/addons`);
}
