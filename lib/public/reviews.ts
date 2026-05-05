import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ReviewRow } from "@/lib/admin/reviews";

export type PublicReview = Pick<ReviewRow,
  | "id" | "rating" | "title" | "comment" | "reviewer_name" | "reviewer_country"
  | "operator_response" | "operator_response_at" | "helpful_count"
  | "is_verified_purchase" | "created_at"
>;

export async function getApprovedReviewsForTour(
  tourId: string,
  opts: { limit?: number; offset?: number; minRating?: number; sort?: string } = {}
): Promise<{ rows: PublicReview[]; total: number }> {
  const { limit = 5, offset = 0, minRating, sort = "newest" } = opts;
  const supabase = createClient();

  let q = supabase
    .from("reviews")
    .select(
      "id, rating, title, comment, reviewer_name, reviewer_country, operator_response, operator_response_at, helpful_count, is_verified_purchase, created_at",
      { count: "exact" }
    )
    .eq("tour_id", tourId)
    .eq("status", "approved");

  if (minRating) q = q.gte("rating", minRating);

  const orderCol = sort === "oldest"   ? "created_at" :
                   sort === "highest"  ? "rating" :
                   sort === "lowest"   ? "rating" :
                   sort === "helpful"  ? "helpful_count" : "created_at";
  const ascending = sort === "oldest" || sort === "lowest";

  q = q.order(orderCol, { ascending })
       .range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as PublicReview[], total: count ?? 0 };
}

/** Check if a logged-in user has a completed, unreviewed booking for this tour. */
export async function canUserReviewTour(tourId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Find a completed booking for this tour by this user
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("user_id", user.id)
    .eq("tour_id", tourId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!booking) return false;

  // Check if they already reviewed it
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();

  return !existing;
}
