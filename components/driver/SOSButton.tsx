"use client";

import { useState } from "react";

type Props = { staffName: string };

export default function SOSButton({ staffName }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);

  async function sendSOS() {
    setSending(true);
    try {
      let coords: { lat: number; lng: number } | null = null;

      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch { /* geolocation unavailable */ }
      }

      await fetch("/api/driver/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName, coords, timestamp: new Date().toISOString() }),
      });

      setSent(true);
      setShowModal(false);
    } catch {
      alert("Failed to send SOS. Call +31 emergency services: 112");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Fixed SOS button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-red-600 text-white font-bold text-xs shadow-lg hover:bg-red-500 active:scale-95 transition-all flex flex-col items-center justify-center leading-none"
        aria-label="SOS emergency">
        <span className="text-base leading-none">🆘</span>
        <span className="text-[9px] mt-0.5">SOS</span>
      </button>

      {/* Confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-ink-black border border-red-400/30 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-red-300">Send SOS alert?</h2>
              <p className="text-sm text-warm-cream/60 mt-2">
                This will email your GPS location and current assignment to the operator immediately.
                Use only in genuine emergency situations.
              </p>
              <p className="text-sm text-warm-cream/70 mt-2">
                🇳🇱 Dutch emergency services: <a href="tel:112" className="text-red-300 font-bold">112</a>
              </p>
            </div>

            {sent && (
              <p className="text-sm text-emerald-400">✓ SOS sent to operator.</p>
            )}

            <div className="flex gap-3">
              <button onClick={sendSOS} disabled={sending}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 transition-colors">
                {sending ? "Sending…" : "Confirm — Send SOS"}
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 rounded-2xl border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
