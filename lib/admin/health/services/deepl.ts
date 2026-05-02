import "server-only";
import type { HealthCheck } from "../types";

const KEY = process.env.DEEPL_API_KEY ?? "";

export async function check(): Promise<HealthCheck> {
  if (!KEY) {
    return {
      service: "deepl",
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: "chars",
      metadata: {},
      error_message: "DEEPL_API_KEY not configured",
    };
  }

  // DeepL Free tier endpoint differs from Pro
  const isFree = KEY.endsWith(":fx");
  const baseUrl = isFree
    ? "https://api-free.deepl.com/v2/usage"
    : "https://api.deepl.com/v2/usage";

  const start = Date.now();
  try {
    const res = await fetch(baseUrl, {
      headers: { Authorization: `DeepL-Auth-Key ${KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      return {
        service: "deepl",
        status: "down",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: "chars",
        metadata: {},
        error_message: `API returned ${res.status}`,
      };
    }

    const data = (await res.json()) as {
      character_count: number;
      character_limit: number;
    };

    const pct = data.character_limit > 0
      ? (data.character_count / data.character_limit) * 100
      : 0;

    const status = pct >= 95 ? "down" : pct >= 75 ? "degraded" : "healthy";

    return {
      service: "deepl",
      status,
      latency_ms,
      quota_used: data.character_count,
      quota_limit: data.character_limit,
      quota_unit: "chars",
      metadata: {
        pct_used: Math.round(pct * 10) / 10,
        tier: isFree ? "free" : "pro",
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "deepl",
      status: "down",
      latency_ms: Date.now() - start,
      quota_used: null,
      quota_limit: null,
      quota_unit: "chars",
      metadata: {},
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Request failed",
    };
  }
}
