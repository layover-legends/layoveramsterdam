"use client";

import { formatMinutes } from "@/lib/builder/time-budget";
import {
  MIN_LAYOVER_MINUTES as MIN,
  MAX_LAYOVER_MINUTES as MAX,
  LAYOVER_STEP_MINUTES as STEP,
  AIRPORT_BUFFER_MINUTES as BUFFER,
} from "@/lib/builder/types";

type Props = {
  value: number; // minutes
  onChange: (v: number) => void;
  labels: Record<string, string>;
};

const tl = (l: Record<string, string>, k: string, fb: string) => l[k] ?? fb;

export default function TimeSlider({ value, onChange, labels }: Props) {
  const available = value - BUFFER;
  const pct = ((value - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <p className="font-display text-5xl font-semibold text-legend-gold tracking-tight">
          {formatMinutes(value)}
        </p>
        <p className="text-sm text-warm-cream/50">
          {tl(labels, "public.builder.step.duration.label", "layover duration")}
        </p>
      </div>

      <div className="relative px-1">
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-warm-cream/10 accent-legend-gold"
          style={{
            background: `linear-gradient(to right, #C9963A ${pct}%, rgba(247,243,236,0.1) ${pct}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-warm-cream/30 mt-2 font-mono">
          <span>3h</span>
          <span>6h</span>
          <span>9h</span>
          <span>12h</span>
        </div>
      </div>

      <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-warm-cream/60">
            {tl(labels, "public.builder.summary.buffer", "Airport buffer")}
          </span>
          <span className="font-mono text-warm-cream/50">{formatMinutes(BUFFER)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-warm-cream">Available for touring</span>
          <span className="font-mono text-legend-gold">{formatMinutes(available)}</span>
        </div>
        <p className="text-[11px] text-warm-cream/35 pt-1">
          {tl(
            labels,
            "public.builder.step.duration.buffer_note",
            "We reserve 90 min for airport re-entry, security, and boarding.",
          )}
        </p>
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[240, 300, 360, 420, 480].map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
              value === m
                ? "bg-legend-gold text-ink-black"
                : "bg-warm-cream/8 text-warm-cream/60 hover:bg-warm-cream/15 hover:text-warm-cream border border-warm-cream/10"
            }`}
          >
            {formatMinutes(m)}
          </button>
        ))}
      </div>
    </div>
  );
}
