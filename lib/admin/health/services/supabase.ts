import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HealthCheck } from "../types";

export async function check(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const db = createAdminClient();

    // DB latency: simple count query
    const { error: qErr } = await db
      .from("destinations")
      .select("id", { count: "exact", head: true });

    const latency_ms = Date.now() - start;

    if (qErr) {
      return {
        service: "supabase",
        status: "down",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: null,
        metadata: {},
        error_message: `DB query failed: ${qErr.message}`,
      };
    }

    // Get auth user count via admin API
    let userCount: number | null = null;
    try {
      const { data: usersData } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
      userCount = (usersData as { total?: number } | null)?.total ?? null;
    } catch {
      // Auth admin API might not be available on all plans
    }

    const status = latency_ms > 2000 ? "degraded" : latency_ms > 500 ? "degraded" : "healthy";

    return {
      service: "supabase",
      status,
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {
        user_count: userCount,
        db_latency_ms: latency_ms,
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "supabase",
      status: "down",
      latency_ms: Date.now() - start,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Unknown error",
    };
  }
}
