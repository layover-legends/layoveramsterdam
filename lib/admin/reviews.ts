import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewRow = {
  id: string;
  booking_id: string;
  user_id: string | null;
  tour_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  reviewer_name: string;
  reviewer_country: string | null;
  status: "pending" | "approved" | "rejected" | "spam" | "flagged";
  rejection_reason: string | null;
  operator_response: string | null;
  operator_response_at: string | null;
  helpful_count: number;
  reported_count: number;
  language: string;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  // joined
  tour_name?: string | null;
  user_email?: string | null;
};

const PAGE_SIZE = 40;

export async function listReviews({
  status,
  tourId,
  page = 1,
}: {
  status?: string;
  tourId?: string;
  page?: number;
} = {}): Promise<{ rows: ReviewRow[]; totalMatching: number; pageSize: number }> {
  const supabase = createClient();
  let q = supabase
    .from("reviews")
    .select("*, tours(name), users(email)", { count: "exact" });

  if (status && status !== "all") q = q.eq("status", status);
  if (tourId) q = q.eq("tour_id", tourId);

  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) throw error;

  const rows: ReviewRow[] = (data ?? []).map((r) => {
    const row = r as typeof r & {
      tours?: { name: string } | null;
      users?: { email: string } | null;
    };
    return {
      ...row,
      tour_name:  row.tours?.name  ?? null,
      user_email: row.users?.email ?? null,
    } as ReviewRow;
  });

  return { rows, totalMatching: count ?? 0, pageSize: PAGE_SIZE };
}

export async function getReviewById(id: string): Promise<ReviewRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, tours(name), users(email)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as typeof data & {
    tours?: { name: string } | null;
    users?: { email: string } | null;
  };
  return { ...r, tour_name: r.tours?.name ?? null, user_email: r.users?.email ?? null } as ReviewRow;
}

export async function getApprovedReviewsForTour(tourId: string, limit = 5): Promise<ReviewRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("tour_id", tourId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ReviewRow[];
}

export async function moderateReview(
  id: string,
  status: "approved" | "rejected" | "spam" | "flagged",
  rejectionReason?: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("reviews").update({
    status,
    rejection_reason: rejectionReason ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function setOperatorResponse(id: string, response: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("reviews").update({
    operator_response:    response,
    operator_response_at: new Date().toISOString(),
    updated_at:           new Date().toISOString(),
  }).eq("id", id);
}
