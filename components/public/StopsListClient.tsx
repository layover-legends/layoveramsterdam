"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { PublicStop, PublicCategory } from "@/lib/public/stops-list-types";
import type { MapStop } from "@/lib/public/map-stops";
import DestinationCard from "@/components/public/DestinationCard";

// Inline t() — never import from lib/i18n/ui in a client component
const t = (l: Record<string, string>, k: string, fb: string) => l[k] ?? fb;

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

type FilterMode = "all" | "free" | "paid";
type ViewMode = "grid" | "map";

type Props = {
  stops: PublicStop[];
  categories: PublicCategory[];
  labels: Record<string, string>;
  totalCount: number;
};

export default function StopsListClient({
  stops,
  categories,
  labels,
  totalCount,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showAdult, setShowAdult] = useState(false);
  const [adultPending, setAdultPending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visibleCategories = useMemo(
    () =>
      categories.filter((c) =>
        stops.some(
          (s) => s.category_id === c.id && (showAdult ? s.is_adult_only : !s.is_adult_only),
        ),
      ),
    [categories, stops, showAdult],
  );

  const filtered = useMemo(() => {
    let list = stops;

    // Adult filter — show only adult stops when toggled on, only family stops when off
    list = list.filter((s) => showAdult ? s.is_adult_only : !s.is_adult_only);

    // Free / Paid filter
    if (filterMode === "free") list = list.filter((s) => !s.requires_booking);
    if (filterMode === "paid") list = list.filter((s) => s.requires_booking);

    // Category filter
    if (categoryId) list = list.filter((s) => s.category_id === categoryId);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }

    return list;
  }, [stops, showAdult, filterMode, categoryId, search]);

  const mapStops = useMemo<MapStop[]>(
    () =>
      filtered
        .filter((s) => s.latitude !== null && s.longitude !== null)
        .map((s) => ({
          id: s.id,
          name: s.name,
          area: s.area,
          slug: s.slug,
          latitude: s.latitude as number,
          longitude: s.longitude as number,
        })),
    [filtered],
  );

  function handleAdultToggle() {
    if (showAdult) {
      setShowAdult(false);
      setCategoryId(null);
    } else {
      setAdultPending(true);
    }
  }

  function confirmAdult() {
    setShowAdult(true);
    setAdultPending(false);
    setCategoryId(null);
  }

  function cancelAdult() {
    setAdultPending(false);
  }

  function selectMode(mode: FilterMode) {
    setFilterMode(mode);
    setCategoryId(null);
  }

  function selectCategory(id: string) {
    setCategoryId(id === categoryId ? null : id);
    setFilterMode("all");
  }

  return (
    <div className="space-y-4">
      {/* Top bar: search + filters toggle + view mode */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(labels, "public.stops.search_placeholder", "Search destinations…")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-warm-cream/[0.06] border border-warm-cream/10 text-warm-cream placeholder:text-muted text-sm focus:outline-none focus:border-legend-gold/40 transition-colors"
          />
        </div>

        {/* Filters button — mobile only */}
        <button
          className="md:hidden px-4 py-2.5 rounded-xl border border-warm-cream/10 text-sm text-warm-cream/70 hover:text-warm-cream hover:border-warm-cream/20 transition-colors flex items-center gap-2"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2" />
          </svg>
          {t(labels, "public.stops.filters_label", "Filters")}
        </button>

        {/* View mode: grid / map */}
        <div className="flex rounded-xl border border-warm-cream/10 overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2.5 text-sm transition-colors ${
              viewMode === "grid"
                ? "bg-legend-gold/15 text-legend-gold font-medium"
                : "text-warm-cream/60 hover:text-warm-cream"
            }`}
          >
            {t(labels, "public.stops.view_grid", "Grid")}
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`px-3 py-2.5 text-sm transition-colors border-l border-warm-cream/10 ${
              viewMode === "map"
                ? "bg-legend-gold/15 text-legend-gold font-medium"
                : "text-warm-cream/60 hover:text-warm-cream"
            }`}
          >
            {t(labels, "public.stops.view_map", "Map")}
          </button>
        </div>
      </div>

      {/* Filter chips — desktop always visible; mobile when filtersOpen */}
      <div className={`${filtersOpen ? "flex" : "hidden"} md:flex flex-wrap gap-2`}>
        {/* All / Free / Paid mode chips */}
        <button
          onClick={() => selectMode("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide transition-colors ${
            filterMode === "all" && !categoryId
              ? "bg-legend-gold text-ink-black"
              : "bg-warm-cream/[0.06] text-warm-cream/70 hover:text-warm-cream border border-warm-cream/10"
          }`}
        >
          {t(labels, "public.stops.filter.all", "All")}
        </button>
        <button
          onClick={() => selectMode("free")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide transition-colors ${
            filterMode === "free"
              ? "bg-legend-gold text-ink-black"
              : "bg-warm-cream/[0.06] text-warm-cream/70 hover:text-warm-cream border border-warm-cream/10"
          }`}
        >
          {t(labels, "public.stops.filter.free", "Free")}
        </button>
        <button
          onClick={() => selectMode("paid")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide transition-colors ${
            filterMode === "paid"
              ? "bg-legend-gold text-ink-black"
              : "bg-warm-cream/[0.06] text-warm-cream/70 hover:text-warm-cream border border-warm-cream/10"
          }`}
        >
          {t(labels, "public.stops.filter.paid", "Paid")}
        </button>

        {/* Category chips */}
        {visibleCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              categoryId === cat.id
                ? "bg-canal-blue text-warm-cream"
                : "bg-warm-cream/[0.06] text-warm-cream/70 hover:text-warm-cream border border-warm-cream/10"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 18+ toggle + count */}
      <div className="flex items-center justify-between gap-4 text-sm">
        <button
          onClick={handleAdultToggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${
            showAdult
              ? "border-red-400/40 bg-red-400/10 text-red-200"
              : "border-warm-cream/10 text-warm-cream/50 hover:text-warm-cream hover:border-warm-cream/20"
          }`}
        >
          <span
            className={`w-7 h-3.5 rounded-full transition-colors relative ${
              showAdult ? "bg-red-400/60" : "bg-warm-cream/10"
            }`}
          >
            <span
              className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${
                showAdult ? "left-[calc(100%-12px)]" : "left-0.5"
              }`}
            />
          </span>
          {t(labels, "public.stops.show_adult", "Show 18+ destinations")}
        </button>

        <span className="text-xs text-muted tabular-nums">
          {filtered.length} / {totalCount}
        </span>
      </div>

      {/* Adult content confirmation dialog */}
      {adultPending && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 space-y-3">
          <p className="text-sm text-warm-cream font-medium">
            {t(labels, "public.stops.adult_confirm", "Are you 18 or older?")}
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmAdult}
              className="px-4 py-2 rounded-lg bg-red-400/20 text-red-200 text-sm font-medium hover:bg-red-400/30 transition-colors"
            >
              {t(labels, "public.stops.adult_yes", "Yes, show 18+ content")}
            </button>
            <button
              onClick={cancelAdult}
              className="px-4 py-2 rounded-lg bg-warm-cream/[0.06] text-warm-cream/70 text-sm hover:text-warm-cream transition-colors"
            >
              {t(labels, "public.stops.adult_cancel", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Content: map or grid */}
      {viewMode === "map" ? (
        <StopsMap stops={mapStops} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-warm-cream/50 py-20 text-sm">
          {t(labels, "public.stops.no_results", "No destinations match your search.")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((stop) => (
            <DestinationCard
              key={stop.id}
              stop={stop}
              freeLabel={t(labels, "public.stops.card.free", "Free")}
              paidLabel={t(labels, "public.stops.card.paid", "Paid")}
              viewLabel={t(labels, "public.stops.card.view", "View →")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
