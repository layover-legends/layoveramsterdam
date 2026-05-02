import "server-only";
import type { HealthCheck } from "../types";

const KEY = process.env.FLIGHTAWARE_API_KEY ?? "";

export async function check(): Promise<HealthCheck> {
  if (!KEY) {
    return {
      service: "flightaware",
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: "requests",
      metadata: {},
      error_message: "FLIGHTAWARE_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    // Lightweight check: fetch Amsterdam Schiphol airport info
    const res = await fetch(
      "https://aeroapi.flightaware.com/aeroapi/airports/EHAM",
      {
        headers: { "x-apikey": KEY },
        signal: AbortSignal.timeout(8000),
      },
    );
    const latency_ms = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return {
        service: "flightaware",
        status: "down",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: "requests",
        metadata: {},
        error_message: "Invalid or expired API key",
      };
    }

    if (res.status === 429) {
      return {
        service: "flightaware",
        status: "degraded",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: "requests",
        metadata: {},
        error_message: "Rate limited — quota may be exhausted",
      };
    }

    if (!res.ok) {
      return {
        service: "flightaware",
        status: "degraded",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: "requests",
        metadata: {},
        error_message: `API returned ${res.status}`,
      };
    }

    const data = (await res.json()) as { airport_code?: string; name?: string };

    return {
      service: "flightaware",
      status: latency_ms > 3000 ? "degraded" : "healthy",
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: "requests",
      metadata: {
        test_airport: data.airport_code ?? "EHAM",
        airport_name: data.name ?? null,
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "flightaware",
      status: "down",
      latency_ms: Date.now() - start,
      quota_used: null,
      quota_limit: null,
      quota_unit: "requests",
      metadata: {},
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Request failed",
    };
  }
}
