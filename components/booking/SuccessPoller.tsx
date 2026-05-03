"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
};

// Polls until the webhook fires and the page reload shows 'paid' status.
export default function SuccessPoller({ bookingId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    let attempts = 0;
    const max = 12; // 12 × 2.5s = 30s max

    const timer = setInterval(() => {
      attempts++;
      startTransition(() => {
        router.refresh();
      });
      if (attempts >= max) clearInterval(timer);
    }, 2500);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="text-center space-y-6 py-12">
      <div className="flex justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-legend-gold border-t-transparent animate-spin" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-warm-cream">
        Confirming your payment…
      </h1>
      <p className="text-warm-cream/50 text-sm">
        This usually takes a few seconds.
      </p>
      <p className="text-warm-cream/25 text-xs font-mono">Booking {bookingId.slice(0, 8).toUpperCase()}</p>
    </div>
  );
}
