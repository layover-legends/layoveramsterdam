import "server-only";

import { createClient } from "@/lib/supabase/server";

export type HomepageReview = {
  id: string;
  rating: number;
  body: string;
  user_name: string;
  nationality: string | null;
  flight_hint: string | null;
};

// Brand-voice fallback reviews — used when DB has fewer than 3 published reviews
const FALLBACK: HomepageReview[] = [
  {
    id: "f1",
    rating: 5,
    body: "I had 6 hours between flights and thought I'd just sit in the terminal. Instead I saw the Anne Frank House, walked the Jordaan, and had the best herring of my life. 90-minute return guarantee held perfectly.",
    user_name: "Sarah K.",
    nationality: "US",
    flight_hint: "KL 1788 · 6h layover",
  },
  {
    id: "f2",
    rating: 5,
    body: "The guide picked me up at arrivals with my name on a sign. Three hours later I'd walked the canals, seen Rembrandt's house, and tasted Dutch cheese at a market. Back at the gate with an hour to spare.",
    user_name: "Thomas R.",
    nationality: "DE",
    flight_hint: "LH 999 · 4h layover",
  },
  {
    id: "f3",
    rating: 5,
    body: "Booked it on a whim with a 7-hour layover on KLM. Best snap decision I've ever made. The canal at golden hour was worth the whole trip. Will fly through Amsterdam just to do it again.",
    user_name: "Mei L.",
    nationality: "SG",
    flight_hint: "KL 836 · 7h layover",
  },
];

export async function getHomepageReviews(): Promise<HomepageReview[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, body, bookings(users(full_name, nationality))")
      .eq("is_published", true)
      .gte("rating", 4)
      .not("body", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error || !data?.length) return FALLBACK;

    const mapped: HomepageReview[] = data
      .filter((r) => r.body)
      .map((r) => {
        const u = (r.bookings as { users?: { full_name?: string; nationality?: string } | null } | null)?.users;
        return {
          id: r.id,
          rating: r.rating,
          body: r.body!,
          user_name: u?.full_name ?? "Traveller",
          nationality: u?.nationality ?? null,
          flight_hint: null,
        };
      });

    return mapped.length >= 3 ? mapped : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
