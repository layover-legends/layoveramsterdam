import type { HomepageReview } from "@/lib/public/homepage-reviews";

type Props = {
  reviews: HomepageReview[];
};

const FLAG: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", NL: "🇳🇱",
  SG: "🇸🇬", AU: "🇦🇺", CA: "🇨🇦", JP: "🇯🇵", CN: "🇨🇳",
  IT: "🇮🇹", ES: "🇪🇸", BR: "🇧🇷", KR: "🇰🇷", IN: "🇮🇳",
};

export default function ReviewsSection({ reviews }: Props) {
  return (
    <section className="py-20 px-5 border-t border-warm-cream/8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-legend-gold font-semibold">
            Guest reviews
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Don&apos;t take our word for it
          </h2>
          <div className="flex justify-center gap-0.5 text-legend-gold text-lg">
            {"★★★★★"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.map((r) => {
            const initial = r.user_name.charAt(0).toUpperCase();
            const flag = r.nationality ? (FLAG[r.nationality] ?? "") : "";

            return (
              <div
                key={r.id}
                className="flex flex-col gap-4 p-6 rounded-2xl border border-warm-cream/10 bg-warm-cream/[0.03]"
              >
                {/* Stars */}
                <div className="flex gap-0.5 text-legend-gold text-sm">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </div>

                {/* Quote */}
                <blockquote className="font-display text-lg italic leading-relaxed text-warm-cream/90 flex-1">
                  &ldquo;{r.body}&rdquo;
                </blockquote>

                {/* Attribution */}
                <div className="flex items-center gap-3 pt-2 border-t border-warm-cream/8">
                  <div className="w-9 h-9 rounded-full bg-legend-gold/20 border border-legend-gold/30 flex items-center justify-center text-sm font-bold text-legend-gold shrink-0">
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-warm-cream">
                      {r.user_name} {flag}
                    </p>
                    {r.flight_hint && (
                      <p className="text-xs text-warm-cream/40 font-mono">{r.flight_hint}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
