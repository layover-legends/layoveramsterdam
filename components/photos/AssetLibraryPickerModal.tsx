"use client";

import { useState, useEffect, useTransition } from "react";
import { listPhotosForPicker } from "@/app/admin/photos/list-action";
import type { PickerPhoto } from "@/app/admin/photos/list-action";
import type { PhotoSource } from "@/lib/photos/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function thumbUrl(photo: PickerPhoto): string {
  if (photo.aspect_ratios_generated?.includes("16:9") && photo.storage_path) {
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}16x9-400.webp`;
  }
  return photo.cdn_url ?? "";
}

type Props = {
  defaultSource?: PhotoSource | "all";
  onSelect: (photoId: string, cdnUrl: string) => void;
  onClose: () => void;
};

export function AssetLibraryPickerModal({ defaultSource = "all", onSelect, onClose }: Props) {
  const [photos, setPhotos] = useState<PickerPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<PhotoSource | "all">(defaultSource);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, startTransition] = useTransition();

  const PAGE_SIZE = 48;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function load(opts: { source: PhotoSource | "all"; q: string; page: number }) {
    startTransition(async () => {
      const result = await listPhotosForPicker({
        source: opts.source === "all" ? undefined : opts.source,
        q:      opts.q,
        page:   opts.page,
        pageSize: PAGE_SIZE,
      });
      setPhotos(result.photos);
      setTotal(result.total);
    });
  }

  useEffect(() => {
    load({ source, q, page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function search() {
    setPage(1);
    load({ source, q, page: 1 });
  }

  const SOURCES: Array<PhotoSource | "all"> = [
    "all", "tour", "destination", "staff", "vehicle", "about", "marketing", "review",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl max-h-[85vh] bg-ink-black border border-warm-cream/15 rounded-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-cream/10">
          <h2 className="font-display text-lg font-semibold text-warm-cream">Asset Library</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-warm-cream/50 hover:text-warm-cream hover:bg-warm-cream/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-warm-cream/10 flex flex-wrap gap-3">
          {/* Source filter */}
          <div className="flex flex-wrap gap-1">
            {SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => { setSource(s); setPage(1); load({ source: s, q, page: 1 }); }}
                className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium transition-colors ${
                  source === s
                    ? "bg-legend-gold text-ink-black"
                    : "bg-warm-cream/8 text-warm-cream/50 hover:text-warm-cream"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 ml-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search alt text…"
              className="px-3 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-sm text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:border-legend-gold/50 w-48"
            />
            <button
              onClick={search}
              className="px-3 py-1.5 rounded-lg bg-warm-cream/10 text-warm-cream text-sm hover:bg-warm-cream/15 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-warm-cream/40">
              <div className="w-5 h-5 rounded-full border-2 border-legend-gold border-t-transparent animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-center text-warm-cream/40 py-16">No photos found.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => onSelect(photo.id, photo.cdn_url ?? "")}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-warm-cream/5 border border-warm-cream/10 hover:border-legend-gold/50 transition-colors focus:outline-none focus:ring-2 focus:ring-legend-gold/50"
                  title={photo.alt_text}
                >
                  {thumbUrl(photo) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl(photo)}
                      alt={photo.alt_text}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      style={{ backgroundColor: photo.dominant_color ?? undefined }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-cream/20 text-2xl">
                      🖼
                    </div>
                  )}

                  {/* Usage count badge */}
                  {photo.usage_count > 0 && (
                    <span className="absolute top-1 right-1 text-[9px] bg-legend-gold/90 text-ink-black font-semibold px-1 rounded-full">
                      ×{photo.usage_count}
                    </span>
                  )}

                  {/* Select overlay */}
                  <div className="absolute inset-0 bg-legend-gold/0 group-hover:bg-legend-gold/15 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-legend-gold text-xl font-bold transition-opacity">
                      ✓
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination + count */}
        <div className="px-5 py-3 border-t border-warm-cream/10 flex items-center justify-between text-xs text-warm-cream/40">
          <span>{total} photos</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const p = page - 1; setPage(p); load({ source, q, page: p }); }}
                disabled={page <= 1}
                className="px-2 py-1 rounded border border-warm-cream/15 disabled:opacity-30 hover:bg-warm-cream/5 transition-colors"
              >
                ←
              </button>
              <span>{page}/{totalPages}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); load({ source, q, page: p }); }}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border border-warm-cream/15 disabled:opacity-30 hover:bg-warm-cream/5 transition-colors"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
