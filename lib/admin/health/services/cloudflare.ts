import "server-only";
import type { HealthCheck } from "../types";

const TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";

export async function check(): Promise<HealthCheck> {
  if (!TOKEN) {
    return {
      service: "cloudflare",
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: "CLOUDFLARE_API_TOKEN not configured",
    };
  }

  const start = Date.now();
  try {
    // Verify token + get zone list
    const [verifyRes, zonesRes] = await Promise.all([
      fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: { Authorization: `Bearer ${TOKEN}` },
        signal: AbortSignal.timeout(8000),
      }),
      fetch("https://api.cloudflare.com/client/v4/zones?name=layover-legends.com", {
        headers: { Authorization: `Bearer ${TOKEN}` },
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    const latency_ms = Date.now() - start;

    if (!verifyRes.ok) {
      return {
        service: "cloudflare",
        status: "down",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: null,
        metadata: {},
        error_message: `Token verification failed: ${verifyRes.status}`,
      };
    }

    type CFResult<T> = { success: boolean; result?: T };
    type ZoneResult = { id: string; name: string; status: string; paused: boolean };

    const [verify, zones] = await Promise.all([
      verifyRes.json() as Promise<CFResult<{ status: string }>>,
      zonesRes.ok
        ? (zonesRes.json() as Promise<CFResult<ZoneResult[]>>)
        : Promise.resolve({ success: false, result: [] }),
    ]);

    const tokenStatus = verify.result?.status ?? "unknown";
    const zoneList = zones.result ?? [];
    const primaryZone = zoneList[0];
    const zoneActive = primaryZone?.status === "active" && !primaryZone.paused;

    return {
      service: "cloudflare",
      status: tokenStatus === "active" && zoneActive !== false ? "healthy" : "degraded",
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {
        token_status: tokenStatus,
        zone_status: primaryZone?.status ?? "not found",
        zone_paused: primaryZone?.paused ?? null,
        zone_name: primaryZone?.name ?? null,
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "cloudflare",
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
