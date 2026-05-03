"use client";

import { useState, useTransition } from "react";
import { notifyServiceWaitlist } from "@/app/actions/notify-waitlist";

type Props = {
  serviceId: string;
  serviceName: string;
  waitlistCount: number;
  onClose: () => void;
};

export default function NotifyWaitlistModal({
  serviceId,
  serviceName,
  waitlistCount,
  onClose,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ sent: number; failed: number } | null>(null);

  function handleNotify() {
    startTransition(async () => {
      const result = await notifyServiceWaitlist(serviceId);
      setDone(result);
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-ink-black border border-warm-cream/15 rounded-2xl p-6 space-y-5 shadow-2xl">
          {done ? (
            <>
              <div className="text-center space-y-2">
                <p className="text-2xl">{done.failed === 0 ? "✓" : "⚠"}</p>
                <p className="font-semibold text-warm-cream">
                  {done.sent > 0 ? `Notified ${done.sent} people` : "No emails sent"}
                  {done.failed > 0 && ` · ${done.failed} failed`}
                </p>
                <p className="text-xs text-warm-cream/50">
                  {serviceName} is now live on the shop.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="font-semibold text-warm-cream">{serviceName} is now active</h2>
                <p className="text-sm text-warm-cream/60">
                  <span className="text-legend-gold font-semibold">{waitlistCount}</span>
                  {waitlistCount === 1 ? " person is" : " people are"} on the waitlist. Notify them now?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleNotify}
                  disabled={pending || waitlistCount === 0}
                  className="flex-1 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {pending ? "Sending…" : `Notify ${waitlistCount}`}
                </button>
                <button
                  onClick={onClose}
                  disabled={pending}
                  className="px-5 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/60 text-sm hover:text-warm-cream hover:border-warm-cream/40 transition-colors"
                >
                  Skip
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
