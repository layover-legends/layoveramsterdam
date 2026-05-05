"use client";

import { useMemo, useState } from "react";
import { SmartImage } from "@/components/photos/SmartImage";
import type { BuilderStop } from "@/lib/builder/types";
import { MAX_STOPS, DEFAULT_DURATION_MINUTES } from "@/lib/builder/types";
import { formatMinutes } from "@/lib/builder/time-budget";
import type { PublicCategory } from "@/lib/public/stops-list-types";

const t = (l: Record<string, string>, k: string, fb: string) => l[k] ?? fb;

type Props = {
  destinations: BuilderStop[];
  categories: PublicCategory[];
  selected: string[];
  layoverMinutes: number;
  availableMinutes: number; // layover - buffer
  onToggle: (id: string) => void;
  labels: Record<string, string>;
  showAdult: boolean;
  onShowAdultChange: (v: boolean) => void;
};

export default function DestinationPicker({
  destinations,
  categories,
  selected,
  layoverMinutes,
  availableMinutes,
  onToggle,
  labels,
  showAdult,
  onShowAdultChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [adultPending, setAdultPending] = useState(false);

  const selectedVisitMinutes = useMemo(
    () =>
      selected.reduce((sum, id) => {
        const s = destinations.find((d) => d.id === id);
        return sum + (s?.duration_minutes ?? DEFAULT_DURATION_MINUTES);
      }, 0),
    [selected, destinations],
  );

  const visibleDests = useMemo(() => {
    let list = destinations.filter((d) =>
      showAdult ? d.is_adult_only : !d.is_adult_only,
    );
    if (categoryId) list = list.filter((d) => d.category_id === categoryId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    return list;
  }, [destinations, showAdult, categoryId, search]);

  const visibleCategories = useMemo(
    () =>
      categories.filter((c) =>
        destinations.some(
          (d) =>
            d.category_id === c.id &&
            (showAdult ? d.is_adult_only : !d.is_adult_only),
        ),
      ),
    [categories, destinations, showAdult],
  );

  const atCap = selected.length >= MAX_STOPS;

  return (
    <div className="space-y-4">
      {/* Live counter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] px-4 py-3 text-sm">
        <span className="font-semibold text-legend-gold">{selected.length} selected</span>
        <span className="text-warm-cream/30">·</span>
        <span className="text-warm-cream/70">{formatMinutes(selectedVisitMinutes)} visit</span>
        {atCap && (
          <>
            <span className="text-warm-cream/30">·</span>
            <span className="text-amber-300/80 text-xs font-medium">
              {t(labels, "public.builder.step.pick.cap_warning", `Max ${MAX_STOPS} stops`)}
            </span>
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destinations…"
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-warm-cream/[0.06] border border-warm-cream/10 text-warm-cream placeholder:text-muted text-sm focus:outline-none focus:border-legend-gold/40 transition-colors"
          />
        </div>
        {/* 18+ toggle */}
        <button
          onClick={() => showAdult ? onShowAdultChange(false) : setAdultPending(true)}
          className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
            showAdult
              ? "border-red-400/40 bg-red-400/10 text-red-200"
              : "border-warm-cream/10 text-warm-cream/50 hover:border-warm-cream/20 hover:text-warm-cream"
          }`}
        >
          18+
        </button>
      </div>

      {/* 18+ confirm */}
      {adultPending && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <p className="text-sm text-warm-cream flex-1">Are you 18 or older?</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { onShowAdultChange(true); setAdultPending(false); }} className="px-4 py-2 rounded-lg bg-red-400/20 text-red-200 text-xs font-semibold hover:bg-red-400/30 transition-colors">
              Yes
            </button>
            <button onClick={() => setAdultPending(false)} className="px-4 py-2 rounded-lg bg-warm-cream/8 text-warm-cream/60 text-xs hover:bg-warm-cream/15 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryId(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !categoryId ? "bg-legend-gold text-ink-black" : "bg-warm-cream/[0.06] text-warm-cream/60 border border-warm-cream/10 hover:text-warm-cream"
          }`}
        >
          All
        </button>
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              categoryId === c.id ? "bg-canal-blue text-warm-cream" : "bg-warm-cream/[0.06] text-warm-cream/60 border border-warm-cream/10 hover:text-warm-cream"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {visibleDests.length === 0 ? (
        <p className="text-center text-warm-cream/40 py-12 text-sm">No destinations found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleDests.map((dest) => {
            const isSelected = selected.includes(dest.id);
            const disabled = atCap && !isSelected;
            return (
              <button
                key={dest.id}
                onClick={() => !disabled && onToggle(dest.id)}
                disabled={disabled}
                className={`relative flex flex-col rounded-2xl border text-left overflow-hidden transition-all ${
                  isSelected
                    ? "border-legend-gold/70 bg-legend-gold/5 shadow-lg shadow-legend-gold/10"
                    : disabled
                    ? "border-warm-cream/5 bg-warm-cream/[0.02] opacity-40 cursor-not-allowed"
                    : "border-warm-cream/10 bg-warm-cream/[0.03] hover:border-legend-gold/30 hover:bg-warm-cream/[0.06]"
                }`}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-legend-gold flex items-center justify-center">
                    <svg className="w-3 h-3 text-ink-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* Photo */}
                {dest.primary_photo_url ? (
                  <SmartImage
                    fallbackUrl={dest.primary_photo_url}
                    alt={dest.name}
                    ratio="4:3"
                    className="w-full h-28"
                  />
                ) : (
                  <div className="w-full h-28 bg-canal-blue/10 flex items-center justify-center text-2xl text-warm-cream/10">◆</div>
                )}
                <div className="p-3 space-y-1">
                  <p className="text-xs font-semibold leading-snug line-clamp-2 text-warm-cream">{dest.name}</p>
                  <p className="text-[10px] text-muted font-mono">{formatMinutes(dest.duration_minutes)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
