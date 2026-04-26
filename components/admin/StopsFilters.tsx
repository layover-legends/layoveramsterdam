"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  type FreeStopCategory,
} from "@/lib/admin/stops";

type Props = {
  initialSearch: string;
  activeCategory: FreeStopCategory | null;
  countsByCategory: Record<FreeStopCategory | "_all", number>;
};

export default function StopsFilters({
  initialSearch,
  activeCategory,
  countsByCategory,
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

  const buildHref = (cat: FreeStopCategory | null) => {
    const next = new URLSearchParams();
    const q = value.trim();
    if (q) next.set("q", q);
    if (cat) next.set("category", cat);
    const qs = next.toString();
    return qs ? `/admin/stops?${qs}` : "/admin/stops";
  };

  const chipBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap";

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search name, neighborhood, description…"
        className="w-full sm:max-w-md px-4 py-2.5 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60"
      />
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref(null)}
          className={
            chipBase +
            " " +
            (activeCategory === null
              ? "bg-brand-orange/15 border-brand-orange/40 text-brand-orange"
              : "border-brand-cream/15 text-brand-cream/70 hover:bg-brand-cream/5")
          }
        >
          All
          <span className="text-brand-cream/50 tabular-nums">
            {countsByCategory._all}
          </span>
        </Link>
        {ALL_CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isActive = activeCategory === cat;
          return (
            <Link
              key={cat}
              href={buildHref(cat)}
              className={
                chipBase +
                " " +
                (isActive
                  ? "bg-brand-orange/15 border-brand-orange/40 text-brand-orange"
                  : "border-brand-cream/15 text-brand-cream/70 hover:bg-brand-cream/5")
              }
            >
              <span aria-hidden>{meta.emoji}</span>
              {meta.label}
              <span className="text-brand-cream/50 tabular-nums">
                {countsByCategory[cat]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
