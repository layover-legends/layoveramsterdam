import { NextResponse } from "next/server";
import { runAllChecks } from "@/lib/admin/health/runner";
import { pruneOldSnapshots } from "@/lib/admin/health/persistence";

/**
 * Vercel cron endpoint — runs every 5 minutes.
 * Authenticated via CRON_SECRET header (Vercel injects this automatically
 * when the cron job fires; set the secret in Vercel project env vars).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const incoming = req.headers.get("authorization");

  // SEC-11: require the secret unconditionally — an unset CRON_SECRET would
  // mean any caller could run health checks and modify the snapshots table.
  if (!secret || incoming !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [results] = await Promise.all([
      runAllChecks(),
      // Prune snapshots older than 7 days to keep the table lean
      pruneOldSnapshots(7),
    ]);

    const summary = {
      checked: results.length,
      healthy: results.filter((r) => r.status === "healthy").length,
      degraded: results.filter((r) => r.status === "degraded").length,
      down: results.filter((r) => r.status === "down").length,
      unknown: results.filter((r) => r.status === "unknown").length,
    };

    return NextResponse.json({ ok: true, summary, ran_at: new Date().toISOString() });
  } catch (e) {
    console.error("[cron/health-check]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
