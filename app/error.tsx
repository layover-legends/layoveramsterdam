"use client";

import { useEffect } from "react";

// error.tsx must be a client component — getUiStrings() is server-only.
// Strings are hardcoded here; keys are seeded in ui-strings.ts for future
// server-rendered wrappers if needed.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Fire-and-forget — works whether @sentry/nextjs is installed or not.
    // The Sentry phase (9d.3) will add the DSN and this will auto-activate.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require("@sentry/nextjs");
      Sentry.captureException(error);
    } catch {
      // Sentry not yet installed — noop
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-ink-black flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-red-400/60 text-sm tracking-[0.2em] uppercase mb-6">
        500
      </p>

      <h1 className="font-display text-4xl sm:text-6xl font-semibold text-warm-cream mb-4 leading-tight">
        Something went off-route
      </h1>

      <p className="text-warm-cream/50 text-lg max-w-sm mb-10">
        An unexpected error occurred. Our team has been notified.
        {error.digest && (
          <span className="block mt-2 font-mono text-xs text-warm-cream/25">
            ref: {error.digest}
          </span>
        )}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={reset}
          className="inline-block bg-legend-gold text-ink-black font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-gold-light transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-block border border-warm-cream/20 text-warm-cream/70 font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:border-warm-cream/40 hover:text-warm-cream transition-colors"
        >
          Go to homepage
        </a>
      </div>
    </div>
  );
}
