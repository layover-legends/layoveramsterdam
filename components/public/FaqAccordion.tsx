"use client";

import { useState } from "react";
import type { FaqRow } from "@/lib/admin/faq-types";

type Props = { entries: FaqRow[] };

export default function FaqAccordion({ entries }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {entries.map((e) => {
        const isOpen = openId === e.id;
        // Anchor ID for deep-linking
        const anchor = e.question
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 60);

        return (
          <div key={e.id} id={anchor}
            className="rounded-xl border border-warm-cream/10 overflow-hidden scroll-mt-20">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : e.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-warm-cream/[0.03] transition-colors"
            >
              <span className="font-medium text-warm-cream/90 text-sm leading-relaxed">
                {e.question}
              </span>
              <span
                className={`shrink-0 text-legend-gold text-lg leading-none transition-transform ${isOpen ? "rotate-45" : ""}`}
                aria-hidden="true">
                +
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-warm-cream/8">
                <p className="text-sm text-warm-cream/75 leading-relaxed whitespace-pre-line">
                  {e.answer}
                </p>
                <a
                  href={`#${anchor}`}
                  className="inline-block mt-2 text-xs text-warm-cream/30 hover:text-warm-cream/50 transition-colors"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  # permalink
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
