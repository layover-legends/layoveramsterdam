"use client";

import { useState, useTransition } from "react";
import { updateServiceAvailability } from "@/app/admin/services/actions";
import { syncServiceToStripe } from "@/app/actions/sync-stripe";
import NotifyWaitlistModal from "./NotifyWaitlistModal";
import type { AvailabilityStatus } from "@/app/admin/services/actions";

const OPTIONS: { value: AvailabilityStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "coming_soon", label: "Soon" },
  { value: "inactive", label: "Off" },
];

type Props = {
  serviceId: string;
  serviceKind: "tour" | "addon";
  serviceName: string;
  current: AvailabilityStatus;
  waitlistCount: number;
};

export default function AvailabilityToggle({
  serviceId,
  serviceKind,
  serviceName,
  current,
  waitlistCount,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [showNotify, setShowNotify] = useState(false);

  function set(status: AvailabilityStatus) {
    if (status === current) return;
    const wasComingSoon = current === "coming_soon";
    const flippingToActive = status === "active";

    startTransition(async () => {
      await updateServiceAvailability(serviceId, status);

      // Auto-sync to Stripe when activating
      if (flippingToActive) {
        await syncServiceToStripe(serviceKind, serviceId).catch(() => {});
        if (wasComingSoon && waitlistCount > 0) {
          setShowNotify(true);
        }
      }
    });
  }

  return (
    <>
      <div
        className={`inline-flex rounded-lg border border-warm-cream/15 overflow-hidden text-[10px] font-semibold ${pending ? "opacity-50 pointer-events-none" : ""}`}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => set(opt.value)}
            className={`px-2.5 py-1 transition-colors ${
              opt.value === current
                ? opt.value === "active"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : opt.value === "coming_soon"
                    ? "bg-amber-400/20 text-amber-300"
                    : "bg-warm-cream/10 text-warm-cream/60"
                : "text-warm-cream/30 hover:text-warm-cream/60"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showNotify && (
        <NotifyWaitlistModal
          serviceId={serviceId}
          serviceName={serviceName}
          waitlistCount={waitlistCount}
          onClose={() => setShowNotify(false)}
        />
      )}
    </>
  );
}
