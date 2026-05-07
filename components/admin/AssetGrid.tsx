"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePhotos } from "@/app/admin/photos/delete-action";

export type AssetRow = {
  id: string;
  storage_path: string;
  cdn_url: string | null;
  alt_text: string;
  source: string;
  original_filename: string | null;
  bytes: number | null;
  width_px: number | null;
  height_px: number | null;
  usage_count: number;
  is_featured: boolean;
  moderation_status: string;
  license_type: string | null;
  license_expires_at: string | null;
  tags: string[];
  dominant_color: string | null;
  created_at: string;
};

type Props = {
  rows: AssetRow[];
  view: "grid" | "list";
};

export default function AssetGrid({ rows, view }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allOnPage) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirm(false);
  }

  function handleDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await deletePhotos(ids);
      if (!res.ok) {
        alert(`Delete failed: ${res.error}`);
        return;
      }
      setSelected(new Set());
      setConfirm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* Selection bar — only visible when something selected */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-2xl border border-legend-gold/30 bg-ink-black/95 backdrop-blur px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-legend-gold font-semibold">
              {selected.size} selected
            </span>
            <button
              onClick={toggleAll}
              className="text-xs text-warm-cream/60 hover:text-warm-cream"
              type="button"
            >
              {allOnPage ? "Deselect all on page" : `Select all ${rows.length} on page`}
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-warm-cream/60 hover:text-warm-cream"
              type="button"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!confirm ? (
              <button
                onClick={() => setConfirm(true)}
                disabled={pending}
                className="px-4 py-1.5 rounded-lg bg-red-500/15 border border-red-400/40 text-red-300 text-xs font-semibold hover:bg-red-500/25 disabled:opacity-50 transition-colors"
                type="button"
              >
                Delete {selected.size} photo{selected.size !== 1 ? "s" : ""}…
              </button>
            ) : (
              <>
                <span className="text-xs text-red-300">
                  Permanently delete {selected.size}? Storage variants + DB rows will be removed.
                </span>
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
                  type="button"
                >
                  {pending ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirm(false)}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg border border-warm-cream/15 text-warm-cream/70 text-xs hover:bg-warm-cream/5 disabled:opacity-50"
                  type="button"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid view */}
      {view === "grid" ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {rows.map((row) => {
            const isSelected = selected.has(row.id);
            return (
              <div
                key={row.id}
                className={`group relative rounded-xl overflow-hidden aspect-square bg-warm-cream/10 transition-all ${
                  isSelected ? "ring-2 ring-legend-gold" : "hover:ring-2 hover:ring-legend-gold/50"
                }`}
              >
                <Link href={`/admin/assets/${row.id}`} className="block w-full h-full">
                  {row.cdn_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={row.cdn_url}
                      alt={row.alt_text}
                      className="w-full h-full object-cover"
                      style={{ backgroundColor: row.dominant_color ?? "#1a1a1a" }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-cream/20 text-2xl">
                      🖼
                    </div>
                  )}
                </Link>

                {/* Selection checkbox — top-left, always visible if selected, on hover otherwise */}
                <label
                  className={`absolute top-1.5 left-1.5 z-10 cursor-pointer rounded-md ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  } transition-opacity`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(row.id)}
                    className="w-5 h-5 rounded-md accent-legend-gold cursor-pointer"
                  />
                </label>

                {/* Status badges */}
                {row.usage_count === 0 && (
                  <span className="absolute top-1 right-1 text-[9px] bg-amber-400/90 text-black px-1 rounded pointer-events-none">
                    orphan
                  </span>
                )}
                {row.is_featured && (
                  <span className="absolute bottom-1 left-1 text-[9px] bg-legend-gold text-black px-1 rounded pointer-events-none">
                    ★
                  </span>
                )}

                {/* Hover overlay (only when not selected) */}
                {!isSelected && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                    <p className="text-[9px] text-white truncate">{row.alt_text || row.original_filename}</p>
                    <p className="text-[8px] text-white/60">{row.usage_count}× · {row.source}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="rounded-2xl border border-warm-cream/10 overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-warm-cream/[0.04] text-warm-cream/55 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-3 text-left font-medium w-8">
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-legend-gold cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Preview</th>
                <th className="px-4 py-3 text-left font-medium">Alt text</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Size</th>
                <th className="px-4 py-3 text-left font-medium">Uses</th>
                <th className="px-4 py-3 text-left font-medium">Uploaded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-warm-cream/[0.03] ${isSelected ? "bg-legend-gold/5" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(row.id)}
                        className="w-4 h-4 rounded accent-legend-gold cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.cdn_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={row.cdn_url}
                          alt=""
                          className="w-12 h-9 object-cover rounded"
                          style={{ backgroundColor: row.dominant_color ?? "#1a1a1a" }}
                        />
                      ) : (
                        <div className="w-12 h-9 rounded bg-warm-cream/10" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-warm-cream/80 max-w-xs">
                      <p className="truncate">{row.alt_text || <span className="text-red-400">Missing!</span>}</p>
                    </td>
                    <td className="px-4 py-3 text-warm-cream/50">{row.source}</td>
                    <td className="px-4 py-3 text-warm-cream/40 font-mono">
                      {row.width_px && row.height_px ? `${row.width_px}×${row.height_px}` : "—"}
                      {row.bytes && <span className="ml-1">· {Math.round(row.bytes / 1024)}KB</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={row.usage_count === 0 ? "text-amber-300" : "text-warm-cream/70"}>
                        {row.usage_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-warm-cream/40">
                      {new Date(row.created_at).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/assets/${row.id}`} className="text-legend-gold hover:text-gold-light">
                        Edit →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
