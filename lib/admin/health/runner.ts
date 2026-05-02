import "server-only";
import type { HealthCheck, ServiceName } from "./types";
import { writeSnapshots } from "./persistence";

// Dynamic imports keep each service isolated — one timeout doesn't block others
async function runOne(service: ServiceName): Promise<HealthCheck> {
  try {
    const mod = await import(`./services/${service}`);
    return await (mod.check as () => Promise<HealthCheck>)();
  } catch (e) {
    return {
      service,
      status: "unknown",
      latency_ms: null,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Failed to load checker",
    };
  }
}

const ALL: ServiceName[] = [
  "supabase", "vercel", "mapbox", "deepl", "resend",
  "stripe", "cloudflare", "google", "flightaware",
];

/** Run all checks in parallel, write results to DB, return results. */
export async function runAllChecks(
  services?: ServiceName[],
): Promise<HealthCheck[]> {
  const targets = services ?? ALL;
  const results = await Promise.all(targets.map(runOne));
  await writeSnapshots(results);
  return results;
}

/** Run a single service check, write result, return it. */
export async function runOneCheck(service: ServiceName): Promise<HealthCheck> {
  const result = await runOne(service);
  await writeSnapshots([result]);
  return result;
}
