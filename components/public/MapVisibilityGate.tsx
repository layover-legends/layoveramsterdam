"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MapStop } from "@/lib/public/map-stops";

function MapSkeleton() {
  return (
    <div className="w-full h-[480px] sm:h-[560px] rounded-2xl border border-legend-gold/15 bg-legend-gold/[0.02] animate-pulse flex items-center justify-center">
      <span className="text-legend-gold/40 text-xs tracking-[0.3em] uppercase font-semibold">
        Loading map…
      </span>
    </div>
  );
}

const StopsMap = dynamic(() => import("@/components/public/StopsMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function MapVisibilityGate({ stops }: { stops: MapStop[] }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sentinelRef}>
      {shouldMount ? <StopsMap stops={stops} /> : <MapSkeleton />}
    </div>
  );
}
