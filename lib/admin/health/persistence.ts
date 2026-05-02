import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HealthCheck, HealthSnapshot, ServiceHistoryPoint, ServiceName } from "./types";
import { ALL_SERVICES } from "./types";

type SnapshotRow = {
  id: string;
  service: ServiceName;
  status: string;
  latency_ms: number | null;
  quota_used: number | null;
  quota_limit: number | null;
  quota_unit: string | null;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
  checked_at: string;
};

function rowToSnapshot(r: SnapshotRow): HealthSnapshot {
  return {
    id: r.id,
    service: r.service,
    status: r.status as HealthSnapshot["status"],
    latency_ms: r.latency_ms,
    quota_used: r.quota_used,
    quota_limit: r.quota_limit,
    quota_unit: r.quota_unit,
    metadata: r.metadata ?? {},
    error_message: r.error_message,
    checked_at: r.checked_at,
  };
}

/** Latest snapshot per service (one row each, 9 total). */
export async function getLatestSnapshots(): Promise<HealthSnapshot[]> {
  const db = createAdminClient();
  const results: HealthSnapshot[] = [];

  // Get the most recent snapshot for each service
  await Promise.all(
    ALL_SERVICES.map(async (service) => {
      const { data } = await db
        .from("service_health_snapshots")
        .select("id, service, status, latency_ms, quota_used, quota_limit, quota_unit, metadata, error_message, checked_at")
        .eq("service", service)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) results.push(rowToSnapshot(data as SnapshotRow));
    }),
  );

  // Sort by service order
  return ALL_SERVICES
    .map((s) => results.find((r) => r.service === s))
    .filter(Boolean) as HealthSnapshot[];
}

/** 24-hour history for one service. */
export async function getServiceHistory(
  service: ServiceName,
  hours = 24,
): Promise<ServiceHistoryPoint[]> {
  const db = createAdminClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from("service_health_snapshots")
    .select("checked_at, status, latency_ms, quota_used, quota_limit")
    .eq("service", service)
    .gte("checked_at", since)
    .order("checked_at", { ascending: true });

  return (data ?? []).map((r) => ({
    checked_at: r.checked_at as string,
    status: r.status as HealthStatus,
    latency_ms: r.latency_ms as number | null,
    quota_used: r.quota_used as number | null,
    quota_limit: r.quota_limit as number | null,
  }));
}

type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

/** Bulk-insert snapshots from a run. */
export async function writeSnapshots(checks: HealthCheck[]): Promise<void> {
  if (checks.length === 0) return;
  const db = createAdminClient();

  const rows = checks.map((c) => ({
    service: c.service,
    status: c.status,
    latency_ms: c.latency_ms,
    quota_used: c.quota_used,
    quota_limit: c.quota_limit,
    quota_unit: c.quota_unit,
    metadata: c.metadata,
    error_message: c.error_message ? sanitizeError(c.error_message) : null,
    checked_at: new Date().toISOString(),
  }));

  const { error } = await db.from("service_health_snapshots").insert(rows);
  if (error) console.error("[health/persistence] write error:", error.message);
}

/** Remove tokens and keys from error messages before storing. */
function sanitizeError(msg: string): string {
  return msg
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/access_token=\S+/gi, "access_token=[REDACTED]")
    .replace(/auth_key=\S+/gi, "auth_key=[REDACTED]")
    .replace(/[a-zA-Z0-9]{32,}/g, (m) => {
      // Redact anything that looks like an API token (long alphanumeric string)
      // but preserve UUIDs (they have hyphens), URLs and common words
      if (/^[a-zA-Z0-9+/=]{40,}$/.test(m)) return "[REDACTED]";
      return m;
    })
    .slice(0, 500);
}

/** Purge snapshots older than `days` days (call periodically to keep table small). */
export async function pruneOldSnapshots(days = 7): Promise<void> {
  const db = createAdminClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  await db
    .from("service_health_snapshots")
    .delete()
    .lt("checked_at", cutoff);
}
