import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { renderReviewRequest } from "@/lib/email/templates/ReviewRequest";

const SECRET = process.env.CRON_SECRET ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://layover-legends.com";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

export async function GET(req: NextRequest) {
  if (!SECRET || req.headers.get("authorization") !== `Bearer ${SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createAdminClient();
  const resend = getResend();

  // Find completed bookings from 24-48h ago with no review request yet
  const now    = new Date();
  const from24 = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const to24   = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: completedBookings } = await admin
    .from("bookings")
    .select("id, user_id, tour_id, tours(name), users(email, full_name)")
    .eq("status", "completed")
    .gte("completed_at", from24)
    .lte("completed_at", to24);

  if (!completedBookings?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
  }

  // Filter to those without a review_request_log row
  const bookingIds = completedBookings.map((b) => b.id);
  const { data: alreadySent } = await admin
    .from("review_request_log")
    .select("booking_id")
    .in("booking_id", bookingIds);

  const sentSet = new Set((alreadySent ?? []).map((r: { booking_id: string }) => r.booking_id));
  const unsent  = completedBookings.filter((b) => !sentSet.has(b.id));

  let sent = 0;
  for (const booking of unsent) {
    const bk = booking as typeof booking & {
      tours?: { name: string } | null;
      users?: { email: string; full_name: string | null } | null;
    };
    const userEmail = bk.users?.email;
    if (!userEmail) continue;

    const token   = crypto.randomUUID();
    const tourName = bk.tours?.name ?? "Your Amsterdam tour";
    const userName = (bk.users?.full_name ?? userEmail.split("@")[0]).split(" ")[0];
    const reviewUrl = `${SITE_URL}/review/${token}`;

    try {
      // Insert log row first (idempotent — prevents double-sends on crash)
      const { error: logErr } = await admin.from("review_request_log").insert({
        booking_id: booking.id,
        unique_token: token,
      });
      if (logErr) continue; // Likely already sent

      const { subject, html } = renderReviewRequest({
        userEmail, userName, tourName, bookingRef: booking.id.slice(0, 8).toUpperCase(), reviewUrl,
      });

      await resend.emails.send({
        from:    "Layover Legends <bookings@layover-legends.com>",
        to:      userEmail,
        subject, html,
      });

      sent++;
    } catch (err) {
      console.error("[cron/review-requests] failed for booking", booking.id, err);
    }
  }

  // +7d reminder for clicked-but-not-completed tokens
  const reminder24 = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const reminder7  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: reminderCandidates } = await admin
    .from("review_request_log")
    .select("booking_id, unique_token")
    .gte("sent_at", reminder24)
    .lte("sent_at", reminder7)
    .is("completed_at", null)
    .not("clicked_at", "is", null); // Only remind if they clicked but didn't submit

  for (const log of (reminderCandidates ?? []) as { booking_id: string; unique_token: string }[]) {
    const { data: bk } = await admin
      .from("bookings")
      .select("id, tours(name), users(email, full_name)")
      .eq("id", log.booking_id)
      .maybeSingle();

    if (!bk) continue;
    const bkTyped = bk as typeof bk & {
      tours?: { name: string } | null;
      users?: { email: string; full_name: string | null } | null;
    };
    const userEmail = bkTyped.users?.email;
    if (!userEmail) continue;

    try {
      const reviewUrl = `${SITE_URL}/review/${log.unique_token}`;
      await resend.emails.send({
        from:    "Layover Legends <bookings@layover-legends.com>",
        to:      userEmail,
        subject: `One last chance to review your ${bkTyped.tours?.name ?? "tour"} — Layover Legends`,
        html: `<p>Hi, you started a review but didn't finish it. <a href="${reviewUrl}">Click here to complete it</a> — it only takes 2 minutes.</p>`,
      });
    } catch { /* non-fatal */ }
  }

  return new Response(JSON.stringify({ ok: true, sent }), { status: 200 });
}
