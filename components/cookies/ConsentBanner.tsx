"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_POLICY_VERSION,
  CONSENT_MAX_AGE,
  type ConsentState,
  parseConsentCookie,
  serializeConsentCookie,
} from "@/lib/cookies/consent";
import CookieSettings from "./CookieSettings";

type Props = {
  labels: Record<string, string>;
};

function lbl(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

function readCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(CONSENT_COOKIE_NAME + "="));
  return match ? match.split("=").slice(1).join("=") : undefined;
}

function writeCookie(state: ConsentState) {
  const value = serializeConsentCookie(state);
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; max-age=${CONSENT_MAX_AGE}; path=/; SameSite=Lax; Secure`;
}

function detectDNT(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1" || (window as { doNotTrack?: string }).doNotTrack === "1";
}

export default function ConsentBanner({ labels }: Props) {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const existing = parseConsentCookie(readCookie());
    if (!existing) {
      // No consent or stale policy version — show banner
      // But if DNT is set, auto-reject and close silently
      if (detectDNT()) {
        writeCookie({
          essential: true,
          analytics: false,
          marketing: false,
          version: CONSENT_POLICY_VERSION,
          timestamp: Date.now(),
        });
        return;
      }
      setVisible(true);
    }
  }, []);

  // Exposed globally so the footer "Manage cookies" link can re-open settings
  useEffect(() => {
    (window as { __openCookieSettings?: () => void }).__openCookieSettings = () => {
      setShowSettings(true);
      setVisible(true);
    };
    return () => {
      delete (window as { __openCookieSettings?: () => void }).__openCookieSettings;
    };
  }, []);

  function accept() {
    writeCookie({
      essential: true,
      analytics: true,
      marketing: true,
      version: CONSENT_POLICY_VERSION,
      timestamp: Date.now(),
    });
    setVisible(false);
  }

  function reject() {
    writeCookie({
      essential: true,
      analytics: false,
      marketing: false,
      version: CONSENT_POLICY_VERSION,
      timestamp: Date.now(),
    });
    setVisible(false);
  }

  function handleSaveSettings(state: ConsentState) {
    writeCookie(state);
    setVisible(false);
    setShowSettings(false);
  }

  if (!visible) return null;

  return (
    <>
      {showSettings ? (
        <CookieSettings
          labels={labels}
          onSave={handleSaveSettings}
          onClose={() => { setShowSettings(false); setVisible(false); reject(); }}
        />
      ) : (
        <div
          role="dialog"
          aria-label={lbl(labels, "cookies.banner.aria_label", "Cookie consent")}
          aria-live="polite"
          className="fixed bottom-0 left-0 right-0 z-50 bg-ink-black border-t border-warm-cream/10 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="flex-1 text-sm text-warm-cream/80 leading-relaxed">
              {lbl(labels, "cookies.banner.body",
                "We use cookies to make your booking work and to improve our service. Optional analytics and marketing cookies are off by default."
              )}{" "}
              <a
                href="/legal/cookies"
                className="underline underline-offset-2 text-legend-gold hover:text-gold-light transition-colors"
              >
                {lbl(labels, "cookies.banner.learn_more", "Learn more")}
              </a>
            </p>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={reject}
                className="px-4 py-2 rounded-full text-sm font-medium border border-warm-cream/30 text-warm-cream/80 hover:bg-warm-cream/10 transition-colors"
              >
                {lbl(labels, "cookies.banner.reject_all", "Reject all")}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-full text-sm font-medium border border-warm-cream/30 text-warm-cream/80 hover:bg-warm-cream/10 transition-colors"
              >
                {lbl(labels, "cookies.banner.customize", "Customize")}
              </button>
              <button
                onClick={accept}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-legend-gold text-ink-black hover:bg-gold-light transition-colors"
              >
                {lbl(labels, "cookies.banner.accept_all", "Accept all")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
