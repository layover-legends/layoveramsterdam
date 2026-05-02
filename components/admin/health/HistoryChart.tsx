"use client";

import type { ServiceHistoryPoint } from "@/lib/admin/health/types";

type Props = {
  data: ServiceHistoryPoint[];
  metric?: "latency" | "quota_pct";
  height?: number;
};

export default function HistoryChart({ data, metric = "latency", height = 80 }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-warm-cream/30">
        Not enough history yet — check back after a few cron runs
      </div>
    );
  }

  const values = data.map((d) => {
    if (metric === "quota_pct") {
      return d.quota_limit && d.quota_limit > 0
        ? (d.quota_used ?? 0) / d.quota_limit * 100
        : null;
    }
    return d.latency_ms;
  });

  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-warm-cream/30">
        No {metric} data in this window
      </div>
    );
  }

  const min = 0;
  const max = Math.max(...validValues, 1);
  const W = 400;
  const H = height;
  const PAD = { top: 8, right: 4, bottom: 20, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const n = data.length;
  const points = values.map((v, i) => ({
    x: PAD.left + (i / (n - 1)) * chartW,
    y: v === null ? null : PAD.top + (1 - (v - min) / (max - min)) * chartH,
    status: data[i].status,
    raw: v,
    time: data[i].checked_at,
  }));

  // Build SVG path from non-null points
  const segments: string[] = [];
  let pathPart = "";
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.y === null) { pathPart = ""; continue; }
    if (pathPart === "") {
      pathPart = `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    } else {
      pathPart += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
    if (i === points.length - 1 || points[i + 1]?.y === null) {
      segments.push(pathPart);
      pathPart = "";
    }
  }

  // Y-axis labels
  const yLabels = [0, 0.5, 1].map((t) => ({
    y: PAD.top + (1 - t) * chartH,
    label: metric === "latency"
      ? `${Math.round(t * max)}ms`
      : `${Math.round(t * max)}%`,
  }));

  // X-axis: first and last time labels
  const first = data[0]?.checked_at;
  const last = data[data.length - 1]?.checked_at;
  function fmtTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      aria-label={`${metric} history chart`}
    >
      {/* Grid lines */}
      {yLabels.map((l) => (
        <g key={l.label}>
          <line
            x1={PAD.left} y1={l.y} x2={W - PAD.right} y2={l.y}
            stroke="rgba(247,243,236,0.06)" strokeWidth={1}
          />
          <text
            x={PAD.left - 4} y={l.y + 3}
            fontSize={8} fill="rgba(247,243,236,0.3)"
            textAnchor="end" fontFamily="monospace"
          >
            {l.label}
          </text>
        </g>
      ))}

      {/* Line paths */}
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#C9963A"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Status dots */}
      {points.map((p, i) => {
        if (p.y === null) return null;
        const color = p.status === "healthy" ? "#C9963A"
          : p.status === "degraded" ? "#FBBF24"
          : "#EF4444";
        return (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} opacity={0.8}>
            <title>{fmtTime(p.time)}: {p.raw !== null ? (metric === "latency" ? `${p.raw}ms` : `${p.raw?.toFixed(1)}%`) : "n/a"}</title>
          </circle>
        );
      })}

      {/* X-axis time labels */}
      {first && (
        <text x={PAD.left} y={H - 4} fontSize={8} fill="rgba(247,243,236,0.3)" fontFamily="monospace">
          {fmtTime(first)}
        </text>
      )}
      {last && (
        <text x={W - PAD.right} y={H - 4} fontSize={8} fill="rgba(247,243,236,0.3)" textAnchor="end" fontFamily="monospace">
          {fmtTime(last)}
        </text>
      )}
    </svg>
  );
}
