"use client";

import { useCallback, useEffect, useState } from "react";
import type { HealthSnapshot, ServiceName } from "@/lib/admin/health/types";
import AlertsBanner from "@/components/admin/health/AlertsBanner";
import HealthGrid from "@/components/admin/health/HealthGrid";

type Props = {
  initialSnapshots: HealthSnapshot[];
};

type ApiResponse = {
  snapshots?: HealthSnapshot[];
  results?: HealthSnapshot[];
};

export default function HealthClient({ initialSnapshots }: Props) {
  const [snapshots, setSnapshots] = useState<HealthSnapshot[]>(initialSnapshots);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = (await res.json()) as ApiResponse;
        if (data.snapshots) {
          setSnapshots(data.snapshots);
          setRefreshedAt(new Date());
        }
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => refresh(true), 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  async function handleTestOne(service: ServiceName) {
    const res = await fetch("/api/admin/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    if (res.ok) {
      const data = (await res.json()) as ApiResponse;
      const result = data.results?.[0];
      if (result) {
        setSnapshots((prev) =>
          prev.some((s) => s.service === service)
            ? prev.map((s) => (s.service === service ? { ...result, id: result.id ?? s.id, checked_at: result.checked_at ?? new Date().toISOString() } : s))
            : [...prev, { ...result, id: result.id ?? crypto.randomUUID(), checked_at: result.checked_at ?? new Date().toISOString() }],
        );
      }
      setRefreshedAt(new Date());
    }
  }

  async function handleRefreshAll() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as ApiResponse;
        if (data.results) {
          setSnapshots(data.results as HealthSnapshot[]);
          setRefreshedAt(new Date());
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AlertsBanner snapshots={snapshots} />
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-warm-cream/50 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-legend-gold"
            />
            Auto-refresh 30s
          </label>
          <button
            onClick={() => refresh(false)}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg border border-warm-cream/15 text-xs text-warm-cream/60 hover:text-warm-cream hover:border-warm-cream/30 transition-colors disabled:opacity-40"
          >
            {isRefreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-legend-gold/15 border border-legend-gold/30 text-xs text-legend-gold hover:bg-legend-gold/25 transition-colors disabled:opacity-40"
          >
            Test all now
          </button>
        </div>
      </div>

      <p className="text-[10px] text-warm-cream/25 font-mono">
        Last updated: {refreshedAt.toLocaleTimeString()}
      </p>

      <HealthGrid snapshots={snapshots} onTestOne={handleTestOne} />
    </div>
  );
}
