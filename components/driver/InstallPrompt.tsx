"use client";

import { useEffect, useState } from "react";

type Platform = "android" | "ios" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || !!(window.navigator as { standalone?: boolean }).standalone;
}

const VISIT_KEY   = "ll_driver_visits";
const DISMISS_KEY = "ll_driver_install_dismissed";

export default function InstallPrompt() {
  const [show, setShow]     = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < 2) return;

    const plat = detectPlatform();
    setPlatform(plat);

    if (plat === "ios") {
      setShow(true);
      setShowIOS(true);
      return;
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    });
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    (deferredPrompt as unknown as { prompt(): Promise<void> }).prompt();
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-legend-gold/30 bg-legend-gold/8 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-warm-cream/90 text-sm">
            Install Driver app
          </p>
          <p className="text-xs text-warm-cream/60">
            Faster access, offline mode, and push notifications for new assignments.
          </p>
        </div>
        <button onClick={dismiss} className="text-warm-cream/40 hover:text-warm-cream/70 text-xl leading-none">×</button>
      </div>

      {showIOS ? (
        <div className="text-xs text-warm-cream/70 space-y-1 rounded-xl bg-warm-cream/5 px-4 py-3">
          <p className="font-medium text-warm-cream/90">To install on iPhone/iPad:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tap the <strong>Share</strong> button <span className="text-legend-gold">⬆</span> at the bottom</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong> in the top-right</li>
          </ol>
        </div>
      ) : (
        <button onClick={install}
          className="w-full px-4 py-2.5 rounded-xl bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
          Install app
        </button>
      )}
    </div>
  );
}
