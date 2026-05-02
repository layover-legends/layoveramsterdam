"use client";

type Props = {
  current: number; // 1-based
  total: number;
  labels?: string[];
};

export default function StepProgress({ current, total, labels }: Props) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done
                  ? "bg-legend-gold text-ink-black"
                  : active
                  ? "bg-legend-gold/20 border-2 border-legend-gold text-legend-gold"
                  : "bg-warm-cream/8 border border-warm-cream/15 text-warm-cream/30"
              }`}
            >
              {done ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            {labels?.[i] && (
              <span className={`hidden sm:block text-xs font-medium ${active ? "text-legend-gold" : done ? "text-warm-cream/50" : "text-warm-cream/25"}`}>
                {labels[i]}
              </span>
            )}
            {step < total && (
              <div className={`h-px flex-1 min-w-[16px] ${done ? "bg-legend-gold/50" : "bg-warm-cream/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
