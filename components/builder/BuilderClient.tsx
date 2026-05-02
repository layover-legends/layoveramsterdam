"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import StepProgress from "@/components/builder/StepProgress";
import TimeSlider from "@/components/builder/TimeSlider";
import DestinationPicker from "@/components/builder/DestinationPicker";
import RouteSummary from "@/components/builder/RouteSummary";
import CtaBar from "@/components/builder/CtaBar";
import { saveRoute } from "@/app/actions/save-route";
import { computeBudget, formatMinutes } from "@/lib/builder/time-budget";
import {
  AIRPORT_BUFFER_MINUTES,
  DEFAULT_DURATION_MINUTES,
  MIN_LAYOVER_MINUTES,
  type BuilderStop,
  type OptimizedRoute,
} from "@/lib/builder/types";
import type { PublicCategory } from "@/lib/public/stops-list-types";
import { SITE } from "@/lib/seo/site";

const t = (l: Record<string, string>, k: string, fb: string) => l[k] ?? fb;

const RouteMap = dynamic(() => import("@/components/builder/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] sm:h-[500px] rounded-2xl border border-legend-gold/15 bg-legend-gold/[0.02] animate-pulse flex items-center justify-center">
      <span className="text-legend-gold/40 text-xs tracking-[0.3em] uppercase font-semibold">Loading map…</span>
    </div>
  ),
});

type Step = 1 | 2 | 3 | 4;

type Props = {
  destinations: BuilderStop[];
  categories: PublicCategory[];
  labels: Record<string, string>;
  cityId: string;
  initialLayoverMinutes?: number;
  initialStopIds?: string[];
};

export default function BuilderClient({
  destinations,
  categories,
  labels,
  cityId,
  initialLayoverMinutes,
  initialStopIds,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [layoverMinutes, setLayoverMinutes] = useState(
    initialLayoverMinutes ?? MIN_LAYOVER_MINUTES,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialStopIds ?? []);
  const [showAdult, setShowAdult] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const availableMinutes = layoverMinutes - AIRPORT_BUFFER_MINUTES;

  const selectedStops = useMemo(
    () =>
      selectedIds
        .map((id) => destinations.find((d) => d.id === id))
        .filter(Boolean) as BuilderStop[],
    [selectedIds, destinations],
  );

  const orderedStops = useMemo(() => {
    if (!optimizedRoute) return selectedStops;
    return optimizedRoute.orderedStopIds
      .map((id) => destinations.find((d) => d.id === id))
      .filter(Boolean) as BuilderStop[];
  }, [optimizedRoute, selectedStops, destinations]);

  const totalVisitMinutes = useMemo(
    () =>
      selectedStops.reduce(
        (sum, s) => sum + (s.duration_minutes ?? DEFAULT_DURATION_MINUTES),
        0,
      ),
    [selectedStops],
  );

  const budget = computeBudget({
    layoverMinutes,
    airportBufferMinutes: AIRPORT_BUFFER_MINUTES,
    visitMinutes: optimizedRoute?.totalVisitMinutes ?? totalVisitMinutes,
    travelMinutes: optimizedRoute?.totalTravelMinutes ?? 0,
  });

  const toggleStop = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setOptimizedRoute(null); // invalidate cached route when selection changes
  }, []);

  const removeStop = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setOptimizedRoute(null);
  }, []);

  async function handleOptimize() {
    if (selectedIds.length === 0) return;
    setIsOptimizing(true);
    setOptimizeError(null);
    setStep(3); // show loading state briefly

    try {
      const res = await fetch("/api/builder/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stop_ids: selectedIds,
          layover_minutes: layoverMinutes,
          transport_mode: "driving",
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const route = (await res.json()) as OptimizedRoute;
      setOptimizedRoute(route);
      setStep(4);
    } catch (e) {
      setOptimizeError("Could not calculate route. Please try again.");
      setStep(2);
    } finally {
      setIsOptimizing(false);
    }
  }

  async function handleSave(): Promise<string | null> {
    if (!optimizedRoute) return null;
    setIsSaving(true);
    try {
      const result = await saveRoute({
        cityId,
        layoverMinutes,
        stopIds: optimizedRoute.orderedStopIds,
        totalTravelMinutes: optimizedRoute.totalTravelMinutes,
        totalVisitMinutes: optimizedRoute.totalVisitMinutes,
        totalDistanceMeters: optimizedRoute.totalDistanceMeters,
        geometryJson: optimizedRoute.geometry,
        legsJson: optimizedRoute.legs,
        transportMode: "driving",
      });
      const url = `${SITE.url}/builder/${result.shareSlug}`;
      setShareUrl(url);
      return url;
    } catch {
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShare() {
    const url = shareUrl ?? (await handleSave());
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard blocked — user sees the URL in the button
      }
    }
  }

  async function handleContinue() {
    const saved = shareUrl
      ? { id: shareUrl.split("/").pop() ?? "", shareSlug: shareUrl.split("/").pop() ?? "" }
      : null;
    if (!saved) {
      const url = await handleSave();
      if (!url) return;
      // redirect to booking options — Phase 8b will build that page
      const slug = url.split("/").pop();
      window.location.href = `/booking?route=${slug}`;
      return;
    }
    window.location.href = `/booking?route=${saved.shareSlug}`;
  }

  const stepLabels = [
    t(labels, "public.builder.step.duration.title", "Duration"),
    t(labels, "public.builder.step.pick.title", "Pick stops"),
    t(labels, "public.builder.step.optimize.button", "Optimize"),
    "Preview",
  ];

  return (
    <div className="space-y-8 pb-32">
      {/* Step progress */}
      <StepProgress current={step} total={4} labels={stepLabels} />

      {/* ── Step 1: Duration ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              {t(labels, "public.builder.step.duration.title", "How long is your layover?")}
            </h2>
          </div>
          <TimeSlider value={layoverMinutes} onChange={setLayoverMinutes} labels={labels} />
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-8 py-3 rounded-full bg-legend-gold text-ink-black font-semibold text-sm uppercase tracking-widest hover:bg-gold-light transition-colors shadow-lg shadow-legend-gold/20"
            >
              Next: Pick stops →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Pick destinations ─────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => setStep(1)} className="text-sm text-warm-cream/50 hover:text-warm-cream transition-colors">
              ← {formatMinutes(layoverMinutes)} layover
            </button>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t(labels, "public.builder.step.pick.title", "Pick your stops")}
            </h2>
            <span className="text-xs text-warm-cream/40">{availableMinutes} min available</span>
          </div>

          <DestinationPicker
            destinations={destinations}
            categories={categories}
            selected={selectedIds}
            layoverMinutes={layoverMinutes}
            availableMinutes={availableMinutes}
            onToggle={toggleStop}
            labels={labels}
            showAdult={showAdult}
            onShowAdultChange={(v) => { setShowAdult(v); setSelectedIds([]); }}
          />

          {optimizeError && (
            <p className="text-sm text-red-400 text-center">{optimizeError}</p>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-full border border-warm-cream/15 text-warm-cream/60 text-sm hover:border-warm-cream/30 hover:text-warm-cream transition-colors">
              ← Back
            </button>
            <button
              onClick={handleOptimize}
              disabled={selectedIds.length === 0 || isOptimizing}
              className="px-8 py-3 rounded-full bg-legend-gold text-ink-black font-semibold text-sm uppercase tracking-widest hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-legend-gold/20"
            >
              {isOptimizing
                ? t(labels, "public.builder.step.optimize.loading", `Optimizing ${selectedIds.length} stops…`)
                : t(labels, "public.builder.step.optimize.button", "Calculate my route →")}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Optimizing ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-legend-gold border-t-transparent animate-spin" />
          <p className="text-warm-cream/70">
            {t(labels, "public.builder.step.optimize.loading", `Optimizing ${selectedIds.length} stops…`)}
          </p>
        </div>
      )}

      {/* ── Step 4: Preview ───────────────────────────────────────────── */}
      {step === 4 && optimizedRoute && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-warm-cream/50 hover:text-warm-cream transition-colors"
            >
              ← Edit stops
            </button>
            <h2 className="font-display text-xl font-semibold tracking-tight">Your route</h2>
            <span className="text-xs text-warm-cream/40">{orderedStops.length} stops</span>
          </div>

          {/* Map + summary: side-by-side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RouteMap
                orderedStops={orderedStops}
                geometry={optimizedRoute.geometry}
                onRemoveStop={(id) => { removeStop(id); handleOptimize(); }}
              />
            </div>
            <div className="lg:col-span-1">
              <RouteSummary
                orderedStops={orderedStops}
                route={optimizedRoute}
                budget={budget}
                labels={labels}
                onRemoveStop={(id) => { removeStop(id); setStep(2); }}
              />
            </div>
          </div>

          <CtaBar
            budget={budget}
            isSaving={isSaving}
            shareUrl={shareUrl}
            labels={labels}
            onContinue={handleContinue}
            onShare={handleShare}
          />
        </div>
      )}
    </div>
  );
}
