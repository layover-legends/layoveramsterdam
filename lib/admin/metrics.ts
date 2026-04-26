import { createClient } from "@/lib/supabase/server";

export type AdminOverview = {
  totalUsers: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  marketingOptInCount: number;
  marketingOptInRate: number; // 0..1
  topCountries: Array<{ code: string; count: number }>;
  topLanguages: Array<{ code: string; count: number }>;
  recentSignups: Array<{
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    nationality: string | null;
    preferred_language: string | null;
    created_at: string | null;
  }>;
};

/**
 * Returns the at-a-glance overview for the admin dashboard.
 * Runs a handful of small parallel queries — fine for a Hobby-tier free
 * Supabase plan up to ~100k users; once we grow we can move this to a
 * materialized view that refreshes every few minutes.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalRes,
    todayRes,
    weekRes,
    monthRes,
    optInRes,
    allCountriesRes,
    allLanguagesRes,
    recentRes,
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfWeek.toISOString()),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("marketing_opt_in", true),
    supabase.from("users").select("nationality"),
    supabase.from("users").select("preferred_language"),
    supabase
      .from("users")
      .select(
        "id, email, full_name, avatar_url, nationality, preferred_language, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalUsers = totalRes.count ?? 0;
  const marketingOptInCount = optInRes.count ?? 0;

  // Aggregate top 5 countries
  const countryTally = new Map<string, number>();
  (allCountriesRes.data ?? []).forEach((r) => {
    const c = r.nationality;
    if (c) countryTally.set(c, (countryTally.get(c) ?? 0) + 1);
  });
  const topCountries = [...countryTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }));

  // Aggregate top 5 languages
  const langTally = new Map<string, number>();
  (allLanguagesRes.data ?? []).forEach((r) => {
    const c = r.preferred_language;
    if (c) langTally.set(c, (langTally.get(c) ?? 0) + 1);
  });
  const topLanguages = [...langTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }));

  return {
    totalUsers,
    signupsToday: todayRes.count ?? 0,
    signupsThisWeek: weekRes.count ?? 0,
    signupsThisMonth: monthRes.count ?? 0,
    marketingOptInCount,
    marketingOptInRate: totalUsers === 0 ? 0 : marketingOptInCount / totalUsers,
    topCountries,
    topLanguages,
    recentSignups: (recentRes.data ?? []) as AdminOverview["recentSignups"],
  };
}

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  nationality: string | null;
  preferred_language: string | null;
  marketing_opt_in: boolean;
  is_admin: boolean | null;
  created_at: string | null;
};

export type UsersListResult = {
  rows: UserRow[];
  totalMatching: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 25;

/**
 * Returns a paginated, optionally-filtered list of users for the
 * /admin/users table. Search matches email or full_name (case-insensitive).
 */
export async function listUsers({
  search = "",
  page = 1,
}: {
  search?: string;
  page?: number;
}): Promise<UsersListResult> {
  const supabase = createClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("users")
    .select(
      "id, email, full_name, avatar_url, phone, nationality, preferred_language, marketing_opt_in, is_admin, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search.trim().length > 0) {
    const s = search.trim();
    // Match either email OR full_name. PostgREST's or() takes ilike patterns.
    q = q.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`);
  }

  const { data, count } = await q;

  return {
    rows: (data ?? []) as UserRow[],
    totalMatching: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}
