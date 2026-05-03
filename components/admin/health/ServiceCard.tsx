"use client";

import type { HealthSnapshot } from "@/lib/admin/health/types";
import { SERVICE_LABELS } from "@/lib/admin/health/types";
import QuotaBar from "./QuotaBar";

type Props = {
  snapshot: HealthSnapshot | null;
  service: string;
  isTesting?: boolean;
  onTest: () => void;
  onOpen: () => void;
};

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    healthy:  { label: "Healthy",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    degraded: { label: "Degraded", cls: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
    down:     { label: "Down",     cls: "bg-red-500/15 text-red-400 border-red-500/30" },
    unknown:  { label: "Unknown",  cls: "bg-warm-cream/8 text-warm-cream/40 border-warm-cream/15" },
  };
  const { label, cls } = cfg[status] ?? cfg.unknown;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function KeyMetric({ snap }: { snap: HealthSnapshot }) {
  const { service, latency_ms, quota_used, quota_limit, quota_unit, metadata } = snap;

  // DeepL: show "X% used (Y / 500k chars)"
  if (service === "deepl" && quota_used !== null && quota_limit !== null) {
    const pct = ((quota_used / quota_limit) * 100).toFixed(1);
    const used = quota_used >= 1000 ? `${(quota_used / 1000).toFixed(0)}k` : String(quota_used);
    const limit = quota_limit >= 1000 ? `${(quota_limit / 1000).toFixed(0)}k` : String(quota_limit);
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-warm-cream/60">{pct}% used ({used} / {limit} chars)</p>
        <QuotaBar used={quota_used} limit={quota_limit} unit="chars" warnAt={75} critAt={95} />
      </div>
    );
  }

  // Stripe: show mode badge
  if (service === "stripe") {
    const mode = (metadata.mode as string) ?? "test";
    const isLive = mode === "live";
    return (
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          isLive ? "bg-red-500 text-white" : "bg-warm-cream/10 text-warm-cream/60"
        }`}>
          {mode}
        </span>
        {latency_ms !== null && (
          <span className="text-xs text-warm-cream/50 font-mono">{latency_ms}ms</span>
        )}
      </div>
    );
  }

  // Quota-based services
  if (quota_used !== null && quota_limit !== null && quota_limit > 0) {
    return <QuotaBar used={quota_used} limit={quota_limit} unit={quota_unit ?? ""} />;
  }

  // Latency-only services
  if (latency_ms !== null) {
    const color = latency_ms > 2000 ? "text-red-400" : latency_ms > 500 ? "text-amber-300" : "text-emerald-400";
    return <p className={`text-sm font-mono ${color}`}>{latency_ms}ms latency</p>;
  }

  return <p className="text-xs text-warm-cream/30 italic">No data</p>;
}

export default function ServiceCard({ snapshot, service, isTesting, onTest, onOpen }: Props) {
  const info = SERVICE_LABELS[service as keyof typeof SERVICE_LABELS] ?? { label: service, icon: "●" };
  const status = snapshot?.status ?? "unknown";

  return (
    <button
      onClick={onOpen}
      className="group w-full text-left rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03] hover:border-warm-cream/20 hover:bg-warm-cream/[0.06] transition-all p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{info.icon}</span>
          <span className="font-semibold text-sm text-warm-cream">{info.label}</span>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Key metric */}
      <div onClick={(e) => e.stopPropagation()}>
        {snapshot ? (
          <>
            <KeyMetric snap={snapshot} />
            {(snapshot.status === "degraded" || snapshot.status === "down") && snapshot.error_message && (
              <p className={`text-[11px] mt-1 line-clamp-2 leading-snug ${
                snapshot.status === "down" ? "text-red-300/80" : "text-amber-300/80"
              }`}>
                ⚠ {snapshot.error_message.length > 80
                    ? snapshot.error_message.slice(0, 80) + "…"
                    : snapshot.error_message}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-warm-cream/30 italic">No data yet</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-warm-cream/8">
        <span className="text-[10px] text-warm-cream/35">
          {snapshot ? relativeTime(snapshot.checked_at) : "Never checked"}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onTest(); }}
          disabled={isTesting}
          className="text-[10px] text-legend-gold/60 hover:text-legend-gold disabled:opacity-40 transition-colors"
        >
          {isTesting ? "Checking…" : "Test now →"}
        </button>
      </div>
    </button>
  );
}
