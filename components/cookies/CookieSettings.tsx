"use client";

import { useState } from "react";
import { CONSENT_POLICY_VERSION, type ConsentState } from "@/lib/cookies/consent";

type Props = {
  labels: Record<string, string>;
  initialState?: ConsentState;
  onSave: (state: ConsentState) => void;
  onClose: () => void;
};

function lbl(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

export default function CookieSettings({ labels, initialState, onSave, onClose }: Props) {
  const [analytics, setAnalytics] = useState(initialState?.analytics ?? false);
  const [marketing, setMarketing] = useState(initialState?.marketing ?? false);

  function save() {
    onSave({
      essential: true,
      analytics,
      marketing,
      version: CONSENT_POLICY_VERSION,
      timestamp: Date.now(),
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lbl(labels, "cookies.settings.title", "Cookie preferences")}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg bg-ink-black border border-warm-cream/10 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">
            {lbl(labels, "cookies.settings.title", "Cookie preferences")}
          </h2>
          <button
            onClick={onClose}
            aria-label={lbl(labels, "common.close", "Close")}
            className="text-warm-cream/50 hover:text-warm-cream transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-warm-cream/60 leading-relaxed">
          {lbl(labels, "cookies.settings.intro",
            "Choose which cookies you allow. Strictly necessary cookies are always active — they keep the site and booking flow working."
          )}
        </p>

        {/* Essential */}
        <div className="flex items-start justify-between gap-4 py-3 border-t border-warm-cream/10">
          <div>
            <p className="text-sm font-semibold">
              {lbl(labels, "cookies.settings.essential_label", "Strictly necessary")}
            </p>
            <p className="text-xs text-warm-cream/50 mt-0.5">
              {lbl(labels, "cookies.settings.essential_desc",
                "Session management, authentication, language preference, security. Cannot be disabled."
              )}
            </p>
          </div>
          <div className="shrink-0 mt-0.5">
            <span className="text-xs font-medium text-legend-gold bg-legend-gold/10 px-2 py-0.5 rounded-full">
              {lbl(labels, "cookies.settings.always_active", "Always active")}
            </span>
          </div>
        </div>

        {/* Analytics */}
        <div className="flex items-start justify-between gap-4 py-3 border-t border-warm-cream/10">
          <div>
            <p className="text-sm font-semibold">
              {lbl(labels, "cookies.settings.analytics_label", "Analytics")}
            </p>
            <p className="text-xs text-warm-cream/50 mt-0.5">
              {lbl(labels, "cookies.settings.analytics_desc",
                "Vercel Speed Insights. Helps us understand which pages perform well. No personal identifiers stored."
              )}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="sr-only peer"
              aria-label={lbl(labels, "cookies.settings.analytics_label", "Analytics")}
            />
            <div className="w-10 h-6 bg-warm-cream/20 peer-focus:outline-none rounded-full peer peer-checked:bg-legend-gold after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ink-black after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>

        {/* Marketing */}
        <div className="flex items-start justify-between gap-4 py-3 border-t border-warm-cream/10">
          <div>
            <p className="text-sm font-semibold">
              {lbl(labels, "cookies.settings.marketing_label", "Marketing")}
            </p>
            <p className="text-xs text-warm-cream/50 mt-0.5">
              {lbl(labels, "cookies.settings.marketing_desc",
                "Future remarketing pixels (Meta, Google Ads). Currently inactive. Enabling now sets the preference for when we activate these."
              )}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="sr-only peer"
              aria-label={lbl(labels, "cookies.settings.marketing_label", "Marketing")}
            />
            <div className="w-10 h-6 bg-warm-cream/20 peer-focus:outline-none rounded-full peer peer-checked:bg-legend-gold after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ink-black after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            className="flex-1 px-4 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors"
          >
            {lbl(labels, "cookies.settings.save", "Save preferences")}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full border border-warm-cream/30 text-warm-cream/70 font-medium text-sm hover:bg-warm-cream/5 transition-colors"
          >
            {lbl(labels, "common.cancel", "Cancel")}
          </button>
        </div>

        <p className="text-xs text-warm-cream/30 text-center">
          {lbl(labels, "cookies.settings.policy_link_prefix", "See our")}{" "}
          <a href="/legal/cookies" className="underline hover:text-warm-cream/50 transition-colors">
            {lbl(labels, "cookies.settings.policy_link", "Cookie policy")}
          </a>{" "}
          {lbl(labels, "cookies.settings.policy_link_suffix", "for the full list.")}
        </p>
      </div>
    </div>
  );
}
