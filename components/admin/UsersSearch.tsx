"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  initialValue: string;
  labels?: Record<string, string>;
};

export default function UsersSearch({ initialValue, labels }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced sync of the search input back into the URL.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.delete("page"); // reset pagination on a new search
      router.replace(`/admin/users?${params.toString()}`);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:max-w-sm">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={labels?.["admin.users.search_placeholder"] ?? "Search by name or email…"}
        className="w-full px-4 py-2.5 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/60 focus:border-legend-gold/60"
      />
    </div>
  );
}
