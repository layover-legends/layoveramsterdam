import "server-only";
import type { HealthCheck } from "../types";

const KEY = process.env.STRIPE_SECRET_KEY ?? "";

export async function check(): Promise<HealthCheck> {
  if (!KEY) {
    return {
      service: "stripe",
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: "STRIPE_SECRET_KEY not configured",
    };
  }

  const isLive = KEY.startsWith("sk_live_");
  const start = Date.now();

  try {
    // Fetch balance + recent events in parallel
    const [balanceRes, eventsRes] = await Promise.all([
      fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${KEY}` },
        signal: AbortSignal.timeout(8000),
      }),
      fetch("https://api.stripe.com/v1/events?limit=5", {
        headers: { Authorization: `Bearer ${KEY}` },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    const latency_ms = Date.now() - start;

    if (!balanceRes.ok) {
      return {
        service: "stripe",
        status: "down",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: null,
        metadata: { mode: isLive ? "live" : "test" },
        error_message: `Stripe API returned ${balanceRes.status}`,
      };
    }

    const [balance, events] = await Promise.all([
      balanceRes.json() as Promise<{
        available?: Array<{ amount: number; currency: string }>;
        livemode?: boolean;
      }>,
      eventsRes.ok
        ? (eventsRes.json() as Promise<{
            data?: Array<{ type: string; created: number }>;
          }>)
        : Promise.resolve({ data: [] }),
    ]);

    const available = balance.available ?? [];
    const recentEvents = (events.data ?? []).map((e) => ({
      type: e.type,
      created: new Date(e.created * 1000).toISOString(),
    }));

    // Count disputes from events
    const disputeCount = recentEvents.filter((e) =>
      e.type.startsWith("charge.dispute"),
    ).length;

    return {
      service: "stripe",
      status: latency_ms > 5000 ? "degraded" : "healthy",
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {
        mode: isLive ? "live" : "test",
        livemode: balance.livemode ?? isLive,
        available_balance: available,
        recent_events: recentEvents,
        dispute_count_recent: disputeCount,
      },
      error_message: null,
    };
  } catch (e) {
    return {
      service: "stripe",
      status: "down",
      latency_ms: Date.now() - start,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: { mode: isLive ? "live" : "test" },
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Request failed",
    };
  }
}
