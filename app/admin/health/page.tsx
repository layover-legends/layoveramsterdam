import { requireAdmin } from "@/lib/auth/require-admin";
import { getLatestSnapshots } from "@/lib/admin/health/persistence";
import HealthClient from "./HealthClient";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  await requireAdmin();
  const snapshots = await getLatestSnapshots();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-warm-cream">
          Service Health
        </h1>
        <p className="text-sm text-warm-cream/50">
          Real-time status for all third-party integrations. Cron runs every 5 minutes.
        </p>
      </header>
      <HealthClient initialSnapshots={snapshots} />
    </div>
  );
}
