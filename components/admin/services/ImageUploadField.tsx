"use client";

import { useState, useRef } from "react";
import Image from "next/image";

// Accept any common image type — server-side validates and converts to WebP
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/tiff";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (server will compress; allow generous input)

type WatermarkPosition = "southeast" | "southwest" | "northeast" | "northwest";

type Props = {
  source: "tour" | "addon";
  slug: string;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
};

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  southeast: "Bottom-right",
  southwest: "Bottom-left",
  northeast: "Top-right",
  northwest: "Top-left",
};

export default function ImageUploadField({ source, slug, currentUrl, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(false);
  const [position, setPosition] = useState<WatermarkPosition>("southeast");
  const [opacity, setOpacity] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("Max 10 MB");
      return;
    }

    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("source", source);
    fd.append("slug", slug.trim() || `_new_${Date.now()}`);
    fd.append("watermark", String(watermark));
    fd.append("watermarkPosition", position);
    fd.append("watermarkOpacity", String(opacity));

    try {
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string; sizeBytes?: number };

      if (!res.ok || json.error) {
        setError(json.error ?? "Upload failed");
        return;
      }

      onChange(json.url ?? null);
    } catch {
      setError("Network error — try again");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-warm-cream/15 overflow-hidden space-y-0">
      {/* Preview */}
      {currentUrl && (
        <div className="relative">
          <Image
            src={currentUrl}
            alt="Service image"
            width={400}
            height={225}
            className="w-full object-cover aspect-video"
            unoptimized
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-ink-black/80 border border-red-400/40 text-red-400 text-xs hover:bg-red-400/15 transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* Upload zone */}
      {!currentUrl && (
        <label
          className={`flex flex-col items-center justify-center gap-2 p-6 cursor-pointer text-center transition-colors ${
            uploading
              ? "bg-warm-cream/5 cursor-not-allowed"
              : "bg-warm-cream/[0.03] hover:bg-warm-cream/[0.06]"
          }`}
        >
          <span className="text-2xl">{uploading ? "⏳" : "🖼"}</span>
          <span className="text-sm text-warm-cream/60">
            {uploading ? "Processing image…" : "Click to upload image"}
          </span>
          <span className="text-[10px] text-warm-cream/30">
            Any image format · max 10 MB · output: 1600px WebP
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            disabled={uploading}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}

      {/* Re-upload zone when image already set */}
      {currentUrl && !uploading && (
        <label className="flex items-center justify-center gap-2 px-4 py-2 cursor-pointer text-[11px] text-warm-cream/40 hover:text-warm-cream/70 border-t border-warm-cream/8 bg-warm-cream/[0.02] hover:bg-warm-cream/[0.05] transition-colors">
          ↑ Replace image
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}

      {/* Processing indicator */}
      {uploading && (
        <div className="px-4 py-3 border-t border-warm-cream/8 bg-warm-cream/[0.03]">
          <div className="flex items-center gap-2 text-xs text-warm-cream/50">
            <div className="w-3 h-3 rounded-full border border-legend-gold border-t-transparent animate-spin flex-none" />
            Processing image…
          </div>
        </div>
      )}

      {/* Watermark controls */}
      <div className="px-4 py-3 border-t border-warm-cream/8 bg-warm-cream/[0.02] space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={watermark}
            onChange={(e) => setWatermark(e.target.checked)}
            className="rounded border-warm-cream/30 bg-warm-cream/5 text-legend-gold focus:ring-legend-gold/30"
          />
          <span className="text-xs text-warm-cream/60">Add Layover Legends watermark</span>
        </label>

        {watermark && (
          <div className="space-y-2.5 pl-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-warm-cream/40">Position</p>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
                style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-warm-cream/15 text-xs focus:outline-none focus:border-legend-gold/50"
              >
                {(Object.entries(POSITION_LABELS) as [WatermarkPosition, string][]).map(
                  ([val, label]) => (
                    <option key={val} value={val} style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-warm-cream/40">Opacity</p>
                <span className="text-[10px] font-mono text-warm-cream/50">{opacity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-legend-gold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="px-4 py-2 text-xs text-red-400 bg-red-400/5 border-t border-red-400/15">
          {error}
        </p>
      )}
    </div>
  );
}
