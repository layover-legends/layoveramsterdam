"use client";

import type { HealthSnapshot } from "@/lib/admin/health/types";

type Props = { snapshots: HealthSnapshot[] };

export default function AlertsBanner({ snapshots }: Props) {
  const down = snapshots.filter((s) => s.status === "down");
  const degraded = snapshots.filter((s) => s.status === "degraded");

  if (down.length === 0 && degraded.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        All systems operational
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
      down.length > 0
        ? "border-red-500/30 bg-red-500/5 text-red-300"
        : "border-amber-400/30 bg-amber-400/5 text-amber-300"
    }`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${down.length > 0 ? "bg-red-400" : "bg-amber-400"}`} />
      {down.length > 0 && (
        <span>
          <strong>{down.length} service{down.length > 1 ? "s" : ""} down:</strong>{" "}
          {down.map((s) => s.service).join(", ")}
        </span>
      )}
      {degraded.length > 0 && (
        <span>
          {down.length > 0 && "· "}
          <strong>{degraded.length} degraded:</strong>{" "}
          {degraded.map((s) => s.service).join(", ")}
        </span>
      )}
    </div>
  );
}
