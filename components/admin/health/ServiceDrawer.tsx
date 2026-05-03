"use client";

import { useEffect, useState } from "react";
import type { HealthSnapshot, ServiceHistoryPoint, ServiceName } from "@/lib/admin/health/types";
import { SERVICE_LABELS } from "@/lib/admin/health/types";
import HistoryChart from "./HistoryChart";
import QuotaBar from "./QuotaBar";

function StatusPillLarge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    healthy:  { label: "Healthy",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    degraded: { label: "Degraded", cls: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
    down:     { label: "Down",     cls: "bg-red-500/15 text-red-400 border-red-500/30" },
    unknown:  { label: "Unknown",  cls: "bg-warm-cream/8 text-warm-cream/40 border-warm-cream/15" },
  };
  const { label, cls } = cfg[status] ?? cfg.unknown;
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return "just now";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function looksLikeStackTrace(msg: string): boolean {
  return msg.includes("\n") || /Error:|at \w/.test(msg);
}

type Props = {
  service: ServiceName | null;
  snapshot: HealthSnapshot | null;
  onClose: () => void;
};

export default function ServiceDrawer({ service, snapshot, onClose }: Props) {
  const [history, setHistory] = useState<ServiceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!service) return;
    setHistory([]);
    setLoading(true);
    fetch(`/api/admin/health/${service}`)
      .then((r) => r.json())
      .then((d: { history?: ServiceHistoryPoint[] }) => setHistory(d.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [service]);

  if (!service) return null;
  const info = SERVICE_LABELS[service] ?? { label: service, icon: "●" };

  const errors = history.filter((h) => h.status !== "healthy" && h.status !== "unknown");

  function fmt(n: number | null): string {
    if (n === null) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-ink-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-ink-black border-l border-warm-cream/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-cream/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">{info.icon}</span>
            <h2 className="font-semibold text-warm-cream">{info.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-warm-cream/50 hover:text-warm-cream hover:bg-warm-cream/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Current snapshot */}
          {snapshot && (
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-widest text-warm-cream/40">Current status</h3>

              {/* Status pill + last checked */}
              <div className="flex items-center gap-3">
                <StatusPillLarge status={snapshot.status} />
                <span className="text-[11px] text-warm-cream/35 font-mono">
                  Last checked {relativeTime(snapshot.checked_at)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] p-3">
                  <p className="text-[10px] text-warm-cream/40 uppercase tracking-wide mb-1">Latency</p>
                  <p className="font-mono text-lg text-warm-cream">{snapshot.latency_ms ?? "—"}ms</p>
                </div>
                {snapshot.quota_used !== null && snapshot.quota_limit !== null && (
                  <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] p-3">
                    <p className="text-[10px] text-warm-cream/40 uppercase tracking-wide mb-1">Quota</p>
                    <p className="font-mono text-lg text-warm-cream">
                      {((snapshot.quota_used / snapshot.quota_limit) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-warm-cream/35 font-mono mt-0.5">
                      {fmt(snapshot.quota_used)} / {fmt(snapshot.quota_limit)} {snapshot.quota_unit ?? ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Quota bar */}
              {snapshot.quota_used !== null && snapshot.quota_limit !== null && (
                <QuotaBar
                  used={snapshot.quota_used}
                  limit={snapshot.quota_limit}
                  unit={snapshot.quota_unit ?? ""}
                />
              )}

              {/* Mapbox sub-quotas */}
              {service === "mapbox" && Array.isArray(snapshot.metadata.sub_quotas) && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-warm-cream/40">Sub-quotas</p>
                  {(snapshot.metadata.sub_quotas as Array<{ name: string; used: number; limit: number; pct: number }>).map((sq) => (
                    <QuotaBar key={sq.name} used={sq.used} limit={sq.limit} label={sq.name} />
                  ))}
                </div>
              )}

              {/* Stripe details */}
              {service === "stripe" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-warm-cream/50">Mode:</span>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                      snapshot.metadata.mode === "live" ? "bg-red-500 text-white" : "bg-warm-cream/10 text-warm-cream/60"
                    }`}>{String(snapshot.metadata.mode ?? "test")}</span>
                  </div>
                  {Array.isArray(snapshot.metadata.recent_events) && snapshot.metadata.recent_events.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-warm-cream/40 mb-1.5">Recent events</p>
                      <ul className="space-y-1">
                        {(snapshot.metadata.recent_events as Array<{ type: string; created: string }>).map((ev, i) => (
                          <li key={i} className="text-[11px] text-warm-cream/60 font-mono flex justify-between">
                            <span>{ev.type}</span>
                            <span className="text-warm-cream/35">{new Date(ev.created).toLocaleTimeString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Error message — full, monospace for stack traces */}
              {snapshot.error_message && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-red-400/60 mb-1.5">Error</p>
                  <p className={`text-xs text-red-300 ${looksLikeStackTrace(snapshot.error_message) ? "font-mono whitespace-pre-wrap break-all" : ""}`}>
                    {snapshot.error_message}
                  </p>
                </div>
              )}

              {/* Metadata JSON */}
              {snapshot.metadata && Object.keys(snapshot.metadata).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-warm-cream/40 mb-1.5">Metadata</p>
                  <pre className="text-[10px] text-warm-cream/50 font-mono bg-warm-cream/[0.03] rounded-lg border border-warm-cream/8 p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(snapshot.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          )}

          {/* 24h latency chart */}
          <section className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-widest text-warm-cream/40">24h latency</h3>
            {loading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-legend-gold border-t-transparent animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="h-20 flex items-center justify-center rounded-lg border border-warm-cream/8 bg-warm-cream/[0.02]">
                <p className="text-xs text-warm-cream/30">No history yet — cron will populate this view every 5 minutes</p>
              </div>
            ) : (
              <HistoryChart data={history} metric="latency" />
            )}
          </section>

          {/* 24h quota chart (if applicable) */}
          {!loading && history.some((h) => h.quota_limit !== null) && (
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-widest text-warm-cream/40">24h quota</h3>
              <HistoryChart data={history} metric="quota_pct" />
            </section>
          )}

          {/* Recent errors */}
          {errors.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest text-warm-cream/40">
                Recent issues ({errors.length})
              </h3>
              <ul className="space-y-2">
                {errors.slice(-10).reverse().map((e, i) => (
                  <li key={i} className="rounded-lg border border-warm-cream/10 bg-warm-cream/[0.03] px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold uppercase ${
                        e.status === "down" ? "text-red-400" : "text-amber-300"
                      }`}>{e.status}</span>
                      <span className="text-[10px] text-warm-cream/30 font-mono">
                        {new Date(e.checked_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {e.latency_ms !== null && (
                      <p className="text-[11px] text-warm-cream/50 font-mono">{e.latency_ms}ms</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
