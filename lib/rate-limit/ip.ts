import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type RateLimitTable = "contact_rate_limits" | "shop_interest_rate_limits";

const WINDOW_MINUTES = 60;

/**
 * IP-based sliding-window rate limiter backed by a Postgres table.
 * Returns { limited: true, retryAfterSeconds } when the caller is over quota.
 * A null IP is always allowed through (avoids blocking requests with no
 * X-Forwarded-For header, e.g. local dev or direct server-to-server calls).
 */
export async function checkIpRateLimit(
  table: RateLimitTable,
  ip: string | null,
  maxPerWindow: number,
): Promise<{ limited: false } | { limited: true; retryAfterSeconds: number }> {
  if (!ip) return { limited: false };

  const admin = createAdminClient();
  const windowMs = WINDOW_MINUTES * 60 * 1000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin.from(table as any) as any)
    .select("count, window_start")
    .eq("ip_address", ip)
    .maybeSingle() as { data: { count: number; window_start: string } | null };

  if (existing) {
    const windowAge = Date.now() - new Date(existing.window_start).getTime();
    if (windowAge < windowMs) {
      if (existing.count >= maxPerWindow) {
        const retryAfterSeconds = Math.ceil((windowMs - windowAge) / 1000);
        return { limited: true, retryAfterSeconds };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from(table as any) as any)
        .update({ count: existing.count + 1 })
        .eq("ip_address", ip);
    } else {
      // Window expired — reset
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from(table as any) as any)
        .update({ count: 1, window_start: new Date().toISOString() })
        .eq("ip_address", ip);
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from(table as any) as any)
      .insert({ ip_address: ip, count: 1, window_start: new Date().toISOString() });
  }

  return { limited: false };
}
