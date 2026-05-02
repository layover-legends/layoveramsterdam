import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="py-24 px-5 bg-gradient-to-b from-ink-black via-canal-blue/5 to-ink-black border-t border-warm-cream/8">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs uppercase tracking-[0.3em] text-legend-gold font-semibold">
          Every layover is an opportunity
        </p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
          Don&apos;t waste your layover.
        </h2>
        <p className="text-warm-cream/60 text-lg leading-relaxed">
          Premium tours between flights.{" "}
          <span className="text-warm-cream/80">90-minute return guarantee.</span>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="#hero-form"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-legend-gold text-ink-black font-semibold text-sm uppercase tracking-widest hover:bg-gold-light active:bg-gold-dark transition-colors shadow-xl shadow-legend-gold/20 animate-cta-pulse"
          >
            Book your tour
          </a>
          <Link
            href="/tours"
            className="w-full sm:w-auto px-8 py-4 rounded-full border border-warm-cream/25 text-warm-cream font-semibold text-sm uppercase tracking-widest hover:border-warm-cream/50 hover:bg-warm-cream/5 transition-colors"
          >
            Explore tours
          </Link>
        </div>
        <p className="text-xs text-warm-cream/30 pt-2">
          Insured · Schiphol-based · Run by locals
        </p>
      </div>
    </section>
  );
}
