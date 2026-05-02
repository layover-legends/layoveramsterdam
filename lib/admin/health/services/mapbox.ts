import "server-only";
import type { HealthCheck } from "../types";

// Uses the account token (separate from public map token) for usage stats.
// Falls back to public token for a simple connectivity check.
const ACCOUNT_TOKEN = process.env.MAPBOX_ACCOUNT_TOKEN;
const PUBLIC_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type MapboxSubQuota = {
  name: string;
  used: number;
  limit: number;
  pct: number;
};

export async function check(): Promise<HealthCheck> {
  const token = ACCOUNT_TOKEN ?? PUBLIC_TOKEN;
  if (!token) {
    return {
      service: "mapbox",
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: "MAPBOX_ACCOUNT_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN not configured",
    };
  }

  const start = Date.now();
  try {
    // Lightweight connectivity check: fetch a single geocoding result
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/amsterdam.json?limit=1&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      return {
        service: "mapbox",
        status: res.status === 401 ? "down" : "degraded",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: null,
        metadata: {},
        error_message: `API returned ${res.status}`,
      };
    }

    // If we have an account token, try to get usage stats
    let subQuotas: MapboxSubQuota[] = [];
    if (ACCOUNT_TOKEN) {
      try {
        const usageRes = await fetch(
          `https://api.mapbox.com/tokens/v2?access_token=${ACCOUNT_TOKEN}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (usageRes.ok) {
          // Token info endpoint — can't get real quota from here, but confirms auth
          subQuotas = []; // Placeholder until Mapbox stats API is available
        }
      } catch {
        // Usage stats unavailable — not critical
      }
    }

    const highestPct = subQuotas.length > 0
      ? Math.max(...subQuotas.map((q) => q.pct))
      : null;

    const status = latency_ms > 3000 ? "degraded" : "healthy";

    return {
      service: "mapbox",
      status,
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: "requests",
      metadata: {
        geocoding_latency_ms: latency_ms,
        sub_quotas: subQuotas,
        highest_quota_pct: highestPct,
        token_type: ACCOUNT_TOKEN ? "account" : "public",
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "mapbox",
      status: "down",
      latency_ms: Date.now() - start,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Request failed",
    };
  }
}
