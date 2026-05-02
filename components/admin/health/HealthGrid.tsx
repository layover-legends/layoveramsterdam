"use client";

import { useState } from "react";
import type { HealthSnapshot, ServiceName } from "@/lib/admin/health/types";
import { ALL_SERVICES } from "@/lib/admin/health/types";
import ServiceCard from "./ServiceCard";
import ServiceDrawer from "./ServiceDrawer";

type Props = {
  snapshots: HealthSnapshot[];
  onTestOne: (service: ServiceName) => Promise<void>;
};

export default function HealthGrid({ snapshots, onTestOne }: Props) {
  const [testing, setTesting] = useState<Set<ServiceName>>(new Set());
  const [openService, setOpenService] = useState<ServiceName | null>(null);

  const snapMap = new Map(snapshots.map((s) => [s.service, s]));

  async function handleTest(service: ServiceName) {
    setTesting((prev) => new Set(prev).add(service));
    try {
      await onTestOne(service);
    } finally {
      setTesting((prev) => {
        const next = new Set(prev);
        next.delete(service);
        return next;
      });
    }
  }

  const openSnapshot = openService ? (snapMap.get(openService) ?? null) : null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ALL_SERVICES.map((service) => (
          <ServiceCard
            key={service}
            service={service}
            snapshot={snapMap.get(service) ?? null}
            isTesting={testing.has(service)}
            onTest={() => handleTest(service)}
            onOpen={() => setOpenService(service)}
          />
        ))}
      </div>

      {openService && (
        <ServiceDrawer
          service={openService}
          snapshot={openSnapshot}
          onClose={() => setOpenService(null)}
        />
      )}
    </>
  );
}
