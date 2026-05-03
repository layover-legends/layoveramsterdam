"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { t } from "@/lib/i18n/t";

type Props = {
  addonSlug: string;
  labels: Record<string, string>;
};

export default function AddToCartButton({ addonSlug, labels }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handle() {
    startTransition(async () => {
      const result = await addToCart(addonSlug);

      if ("authRequired" in result) {
        router.push(
          `/?auth_required=1&next=${encodeURIComponent(`/shop/${addonSlug}`)}`,
        );
        return;
      }
      if ("bookingId" in result) {
        router.push(`/booking/${result.bookingId}/addons`);
        return;
      }
      // error — stay on page, could toast in a future iteration
    });
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="w-full sm:w-auto px-6 py-3 rounded-full bg-legend-gold text-ink-black font-semibold text-sm tracking-wide hover:bg-gold-light active:bg-gold-dark transition-colors disabled:opacity-50"
    >
      {pending
        ? "…"
        : t(labels, "shop.add_to_cart", "Add to cart →")}
    </button>
  );
}
