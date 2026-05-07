import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

/**
 * Weekly cleanup — deletes audit_logs older than 90 days.
 *
 * Audit logs are append-only and grow ~100s of rows/day across photo uploads,
 * service edits, deletes, etc. Without retention they accumulate indefinitely
 * and slow down recent-activity queries.
 *
 * Triggered by Vercel Cron weekly (see vercel.json — schedule "0 3 * * 0").
 * Authentication: Vercel sets `Authorization: Bearer ${CRON_SECRET}` on
 * scheduled invocations. We require it on every request.
 */
export async function GET(req: NextRequest) {
  // Vercel cron auth
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cleanup_old_audit_logs", { retention_days: 90 });

  if (error) {
    console.error("[audit-log-cleanup] failed:", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const deleted = (data as number) ?? 0;
  console.log(`[audit-log-cleanup] deleted ${deleted} rows older than 90 days`);
  return new Response(JSON.stringify({ ok: true, deleted }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
