"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ReviewSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitReview(formData: FormData): Promise<ReviewSubmitResult> {
  const token    = (formData.get("token")        as string | null)?.trim() ?? "";
  const bookingId= (formData.get("booking_id")   as string | null)?.trim() ?? "";
  const tourId   = (formData.get("tour_id")      as string | null)?.trim() || null;
  const rating   = parseInt(formData.get("rating") as string || "0", 10);
  const title    = (formData.get("title")        as string | null)?.trim() || null;
  const comment  = (formData.get("comment")      as string | null)?.trim() ?? "";
  const reviewerName = ((formData.get("reviewer_name") as string | null) ?? "").trim();
  const reviewerCountry = ((formData.get("reviewer_country") as string | null) ?? "").trim() || null;

  if (!token || !bookingId) return { ok: false, error: "Invalid request." };
  if (rating < 1 || rating > 5) return { ok: false, error: "Please select a rating." };
  if (!comment || comment.length < 30) return { ok: false, error: "Comment must be at least 30 characters." };
  if (comment.length > 4000) return { ok: false, error: "Comment is too long (max 4000 characters)." };
  if (!reviewerName) return { ok: false, error: "Please enter your name." };

  const admin = createAdminClient();

  // Validate token + not already submitted
  const { data: logRow } = await admin
    .from("review_request_log")
    .select("booking_id, completed_at")
    .eq("unique_token", token)
    .maybeSingle();

  if (!logRow || logRow.booking_id !== bookingId) {
    return { ok: false, error: "Invalid review link." };
  }
  if (logRow.completed_at) {
    return { ok: false, error: "This review link has already been used." };
  }

  const h  = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = h.get("user-agent") ?? null;

  // Get the user_id from the booking for RLS compliance
  const { data: booking } = await admin
    .from("bookings")
    .select("user_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "completed") {
    return { ok: false, error: "Reviews can only be submitted for completed bookings." };
  }

  // Insert review (via admin client — bypasses RLS; token validation is our auth)
  const { error: insertErr } = await admin.from("reviews").insert({
    booking_id:           bookingId,
    user_id:              booking.user_id,
    tour_id:              tourId,
    rating,
    title,
    comment,
    language:             "en",
    reviewer_name:        reviewerName,
    reviewer_country:     reviewerCountry,
    status:               "pending",
    is_verified_purchase: true,
    ip_address:           ip,
    user_agent:           ua,
  });

  if (insertErr) {
    console.error("[review submit]", insertErr.message);
    return { ok: false, error: "Failed to submit review. Please try again." };
  }

  // Mark token as used (single-use enforcement)
  await admin.from("review_request_log").update({
    completed_at: new Date().toISOString(),
  }).eq("unique_token", token);

  return { ok: true };
}
