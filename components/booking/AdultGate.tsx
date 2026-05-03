"use client";

import { useState, type ReactNode } from "react";
import { recordAdultConsent } from "@/lib/age-verification/verify";

type Props = {
  labels: Record<string, string>;
  children: ReactNode;
};

function lbl(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

/**
 * Wraps adult-only content (After Dark tours, adult standalones).
 * Shows a DOB + consent gate before revealing the booking CTA.
 * Verified via server action; persists consent in DB for 90 days.
 *
 * Parent server component must pass `isAdultVerified` prop (from checkAdultConsent()).
 * If already verified, renders children directly.
 */
export default function AdultGate({
  labels,
  children,
}: Props) {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [checked, setChecked] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checked) {
      setError(lbl(labels, "adult_gate.error_checkbox", "Please confirm you are 18 or older."));
      return;
    }
    if (!dob) {
      setError(lbl(labels, "adult_gate.error_dob", "Please enter your date of birth."));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await recordAdultConsent(dob);
      if (result.ok) {
        setVerified(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError(lbl(labels, "adult_gate.error_generic", "Verification failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  if (verified) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 p-6 space-y-5">
      <div className="space-y-2">
        <p className="text-base font-semibold text-legend-gold uppercase tracking-wide text-xs">
          {lbl(labels, "adult_gate.badge", "18+ Content")}
        </p>
        <h3 className="font-display text-xl font-semibold">
          {lbl(labels, "adult_gate.title", "Age verification required")}
        </h3>
        <p className="text-sm text-warm-cream/70 leading-relaxed">
          {lbl(labels, "adult_gate.body",
            "This tour includes adult-only content (after-dark venues, coffee shops, or red-light district). You must be 18 or older to book."
          )}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="adult-dob" className="block text-sm font-medium text-warm-cream/80">
            {lbl(labels, "adult_gate.dob_label", "Your date of birth")}
          </label>
          <input
            id="adult-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-warm-cream/5 border border-warm-cream/20 text-warm-cream focus:outline-none focus:ring-2 focus:ring-legend-gold/50 text-sm"
            style={{ colorScheme: "dark" }}
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-warm-cream/30 accent-legend-gold"
          />
          <span className="text-sm text-warm-cream/70 leading-relaxed">
            {lbl(labels, "adult_gate.confirm_label",
              "I confirm that I am 18 years of age or older and consent to accessing this content."
            )}
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light active:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {loading
            ? lbl(labels, "adult_gate.verifying", "Verifying…")
            : lbl(labels, "adult_gate.submit", "Confirm age & continue")}
        </button>
      </form>

      <p className="text-xs text-warm-cream/30 leading-relaxed">
        {lbl(labels, "adult_gate.privacy_note",
          "Your date of birth is stored securely and used only for age verification. It is not shared with third parties. Verification is valid for 90 days."
        )}
      </p>
    </div>
  );
}
