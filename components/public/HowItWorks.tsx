const STEPS = [
  {
    num: "01",
    title: "Tell us your flights",
    body: "Enter your arrival and departure. We calculate exactly how much Amsterdam you can fit in.",
    svg: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-legend-gold/60" aria-hidden>
        <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 18h36" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 6v4M32 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 26h8M14 32h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: "02",
    title: "We match you a tour",
    body: "Our algorithm picks tours that fit your layover window — with 90 minutes buffer before takeoff.",
    svg: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-legend-gold/60" aria-hidden>
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 12v12l7 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    num: "03",
    title: "Your guide picks you up",
    body: "A local guide meets you at arrivals. No taxis, no logistics. Amsterdam starts the moment you land.",
    svg: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-legend-gold/60" aria-hidden>
        <path d="M24 10c-5.5 0-10 4.5-10 10 0 7 10 18 10 18s10-11 10-18c0-5.5-4.5-10-10-10z" stroke="currentColor" strokeWidth="2"/>
        <circle cx="24" cy="20" r="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    num: "04",
    title: "Back 90 min before takeoff",
    body: "We drop you at departures with time to spare. Your flight is always the priority.",
    svg: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-legend-gold/60" aria-hidden>
        <path d="M8 32l10-8 6 4 8-10 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M36 28l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 px-5">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-legend-gold font-semibold">
            How it works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            From arrivals to back at the gate
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="relative p-6 rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03] space-y-4 group hover:border-legend-gold/20 hover:bg-warm-cream/[0.05] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-4xl font-semibold text-legend-gold/25 leading-none select-none">
                  {step.num}
                </span>
                {step.svg}
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-warm-cream/60 leading-relaxed">
                  {step.body}
                </p>
              </div>
              {/* connector line — hidden on last */}
              {step.num !== "04" && (
                <div className="hidden lg:block absolute -right-3 top-1/2 w-6 h-px bg-warm-cream/15" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
