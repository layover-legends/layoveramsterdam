"use client";

import type { BudgetResult } from "@/lib/builder/time-budget";
import { formatMinutes } from "@/lib/builder/time-budget";

const t = (l: Record<string, string>, k: string, fb: string) => l[k] ?? fb;

type Props = {
  budget: BudgetResult;
  isSaving: boolean;
  shareUrl: string | null;
  labels: Record<string, string>;
  onContinue: () => void;
  onShare: () => void;
};

export default function CtaBar({
  budget,
  isSaving,
  shareUrl,
  labels,
  onContinue,
  onShare,
}: Props) {
  async function handleCopyLink() {
    if (!shareUrl) {
      onShare();
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback — show the URL
    }
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-ink-black/95 backdrop-blur-md border-t border-warm-cream/10 px-4 py-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3">
        {/* Budget summary */}
        <div className="text-sm text-warm-cream/50 hidden sm:block flex-1">
          {budget.fits ? (
            <span>
              {formatMinutes(budget.remaining)}{" "}
              <span className="text-legend-gold/60">spare</span>
            </span>
          ) : (
            <span className="text-red-400/80">
              Over by {formatMinutes(Math.abs(budget.remaining))}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyLink}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream text-sm font-medium uppercase tracking-wide hover:border-warm-cream/40 hover:bg-warm-cream/5 transition-colors disabled:opacity-50"
          >
            {shareUrl
              ? t(labels, "public.builder.cta.share", "Copy link")
              : isSaving
              ? "Saving…"
              : t(labels, "public.builder.cta.save", "Save & share")}
          </button>

          <button
            onClick={onContinue}
            disabled={isSaving || !budget.fits}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm uppercase tracking-widest hover:bg-gold-light active:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-legend-gold/20"
          >
            {isSaving
              ? "Saving…"
              : t(labels, "public.builder.cta.continue", "Continue to booking →")}
          </button>
        </div>
      </div>
    </div>
  );
}
