"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  STOP_FILTERS,
  type Category,
  type StopFilter,
} from "@/lib/admin/stops-types";

type Props = {
  initialSearch: string;
  activeFilter: StopFilter;
  activeCategorySlug: string | null;
  filterCounts: Record<StopFilter, number>;
  categoriesByCount: Array<{ category: Category; count: number }>;
  labels?: Record<string, string>;
};

const chipBase =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap";

export default function StopsFilters({
  initialSearch,
  activeFilter,
  activeCategorySlug,
  filterCounts,
  categoriesByCount,
  labels,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(Array.from(params.entries()));
      const trimmed = value.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.delete("page");
      router.replace(`/admin/stops?${next.toString()}`);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const buildFilterHref = (filter: StopFilter) => {
    const next = new URLSearchParams();
    const q = value.trim();
    if (q) next.set("q", q);
    if (filter !== "all") next.set("filter", filter);
    if (activeCategorySlug) next.set("category", activeCategorySlug);
    const qs = next.toString();
    return qs ? `/admin/stops?${qs}` : "/admin/stops";
  };

  const buildCategoryHref = (slug: string | null) => {
    const next = new URLSearchParams();
    const q = value.trim();
    if (q) next.set("q", q);
    if (activeFilter !== "all") next.set("filter", activeFilter);
    if (slug) next.set("category", slug);
    const qs = next.toString();
    return qs ? `/admin/stops?${qs}` : "/admin/stops";
  };

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={labels?.["admin.stopsFilters.search_placeholder"] ?? "Search name, area or description…"}
        className="w-full sm:max-w-md px-4 py-2.5 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/60 focus:border-legend-gold/60"
      />

      <div className="flex flex-wrap gap-2">
        {STOP_FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <Link
              key={f.key}
              href={buildFilterHref(f.key)}
              className={
                chipBase +
                " " +
                (isActive
                  ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                  : "border-warm-cream/15 text-warm-cream/70 hover:bg-warm-cream/5")
              }
            >
              {f.label}
              <span className="text-warm-cream/50 tabular-nums">
                {filterCounts[f.key]}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={buildCategoryHref(null)}
          className={
            chipBase +
            " " +
            (activeCategorySlug === null
              ? "bg-warm-cream/10 border-warm-cream/30 text-warm-cream"
              : "border-warm-cream/10 text-warm-cream/55 hover:bg-warm-cream/5")
          }
        >
          {labels?.["admin.stopsFilters.all_categories"] ?? "All categories"}
        </Link>
        {categoriesByCount.map(({ category, count }) => {
          const isActive = activeCategorySlug === category.slug;
          return (
            <Link
              key={category.id}
              href={buildCategoryHref(category.slug)}
              className={
                chipBase +
                " " +
                (isActive
                  ? "bg-warm-cream/10 border-warm-cream/30 text-warm-cream"
                  : "border-warm-cream/10 text-warm-cream/55 hover:bg-warm-cream/5")
              }
            >
              {category.name}
              <span className="text-warm-cream/40 tabular-nums">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
