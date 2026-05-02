import "server-only";
import type { HealthCheck } from "../types";

const TOKEN = process.env.VERCEL_API_TOKEN;

export async function check(): Promise<HealthCheck> {
  if (!TOKEN) {
    return {
      service: "vercel",
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: "VERCEL_API_TOKEN not configured",
    };
  }

  const start = Date.now();
  try {
    const res = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      return {
        service: "vercel",
        status: "degraded",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: null,
        metadata: {},
        error_message: `API returned ${res.status}`,
      };
    }

    const data = (await res.json()) as { user?: { username?: string } };

    return {
      service: "vercel",
      status: "healthy",
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {
        username: data.user?.username ?? null,
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "vercel",
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
