import "server-only";
import type { HealthCheck } from "../types";

const KEY = process.env.RESEND_API_KEY ?? "";

export async function check(): Promise<HealthCheck> {
  if (!KEY) {
    return {
      service: "resend",
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: "emails",
      metadata: {},
      error_message: "RESEND_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      return {
        service: "resend",
        status: res.status === 401 ? "down" : "degraded",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: "emails",
        metadata: {},
        error_message: `API returned ${res.status}`,
      };
    }

    const data = (await res.json()) as {
      data?: Array<{ id: string; name: string; status: string }>;
    };

    const domains = data.data ?? [];
    const verifiedCount = domains.filter((d) => d.status === "verified").length;

    return {
      service: "resend",
      status: "healthy",
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: "emails",
      metadata: {
        domain_count: domains.length,
        verified_domains: verifiedCount,
        domains: domains.map((d) => ({ name: d.name, status: d.status })),
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "resend",
      status: "down",
      latency_ms: Date.now() - start,
      quota_used: null,
      quota_limit: null,
      quota_unit: "emails",
      metadata: {},
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Request failed",
    };
  }
}
