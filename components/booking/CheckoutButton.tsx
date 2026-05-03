"use client";

import { useTransition } from "react";
import { redirectToCheckout } from "@/app/actions/checkout";
import { t } from "@/lib/i18n/t";

type Props = {
  bookingId: string;
  labels: Record<string, string>;
};

export default function CheckoutButton({ bookingId, labels }: Props) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      await redirectToCheckout(bookingId);
    });
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="w-full py-4 rounded-full bg-legend-gold text-ink-black font-semibold text-base tracking-wide hover:bg-gold-light active:bg-gold-dark transition-colors disabled:opacity-50 shadow-lg"
    >
      {pending ? "Redirecting to Stripe…" : t(labels, "checkout.review.pay_button", "Pay with Stripe →")}
    </button>
  );
}
