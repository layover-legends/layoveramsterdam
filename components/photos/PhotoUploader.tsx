"use client";

import { useState, useTransition, useEffect } from "react";
import { SmartImage } from "@/components/photos/SmartImage";
import { AssetLibraryPickerModal } from "@/components/photos/AssetLibraryPickerModal";
import { uploadPhoto } from "@/app/admin/photos/upload-action";
import { linkPhotoToEntity } from "@/app/admin/photos/link-action";
import type { PhotoSource, PhotoUsageEntityType, AspectRatio } from "@/lib/photos/types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/tiff";

type Props = {
  source: PhotoSource;
  entityType?: PhotoUsageEntityType;
  entityId?: string;
  fieldName?: string;
  currentLegacyUrl?: string | null;
  ratio?: AspectRatio;
  defaultAltText?: string;
  onUploadComplete?: (result: { photo_id: string; cdn_url: string }) => void;
};

export function PhotoUploader({
  source,
  entityType,
  entityId,
  fieldName,
  currentLegacyUrl,
  ratio = "16:9",
  defaultAltText,
  onUploadComplete,
}: Props) {
  const [pending, startTransition]    = useTransition();
  const [error, setError]             = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(currentLegacyUrl ?? null);
  // null = use site_settings default, true = force on, false = force off
  const [wmOverride, setWmOverride]   = useState<boolean | null>(null);
  // null = use site default; otherwise override at upload time
  const [wmPosition, setWmPosition]   = useState<string | null>(null);
  const [wmOpacity,  setWmOpacity]    = useState<number | null>(null);
  const [longRunning, setLongRunning] = useState(false);

  useEffect(() => {
    if (!pending) { setLongRunning(false); return; }
    const t = setTimeout(() => setLongRunning(true), 30_000);
    return () => clearTimeout(t);
  }, [pending]);

  const hasEntity = !!(entityType && entityId && fieldName);

  const aspectClass: Record<AspectRatio, string> = {
    "1:1":  "aspect-square",
    "4:3":  "aspect-[4/3]",
    "16:9": "aspect-video",
    "21:9": "aspect-[21/9]",
    "9:16": "aspect-[9/16]",
  };

  async function handleFile(file: File) {
    setError(null);

    const altText = window.prompt(
      "Describe this image for screen readers (required, min 3 characters):",
      defaultAltText ?? ""
    );
    if (!altText || altText.trim().length < 3) {
      setError("Alt text is required (min 3 chars). Upload cancelled.");
      return;
    }

    startTransition(async () => {
      // Next.js 14 server actions only accept File via FormData (never inside
      // a plain object — that throws "Only plain objects, and a few built-ins,
      // can be passed to Server Actions").
      const fd = new FormData();
      fd.append("file", file);
      fd.append("alt_text", altText.trim());
      fd.append("source", source);
      if (entityType) fd.append("entity_type", entityType);
      if (entityId)   fd.append("entity_id",   entityId);
      if (fieldName)  fd.append("field_name",  fieldName);
      fd.append("replace_existing", "true");
      if (wmOverride !== null) fd.append("watermark_enabled", String(wmOverride));
      // Only send position/opacity overrides when watermark is explicitly ON
      if (wmOverride === true && wmPosition !== null) fd.append("watermark_position", wmPosition);
      if (wmOverride === true && wmOpacity  !== null) fd.append("watermark_opacity",  String(wmOpacity));

      const result = await uploadPhoto(fd);

      if (!result.ok) {
        const friendly: Record<string, string> = {
          unauthorized:      "Sign in to upload.",
          forbidden:         "Admin access required.",
          alt_text_required: "Alt text is required.",
          file_too_large_20mb: "File exceeds 20 MB limit.",
        };
        setError(friendly[result.error] ?? result.error);
        return;
      }

      setPreviewUrl(result.cdn_url);
      onUploadComplete?.(result);
    });
  }

  async function handleLibrarySelect(photoId: string, cdnUrl: string) {
    setError(null);
    setShowLibrary(false);

    if (hasEntity) {
      const linkResult = await linkPhotoToEntity(photoId, entityType!, entityId!, fieldName!);
      if (!linkResult.ok) {
        setError(linkResult.error);
        return;
      }
    }

    setPreviewUrl(cdnUrl);
    onUploadComplete?.({ photo_id: photoId, cdn_url: cdnUrl });
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className={`${aspectClass[ratio]} bg-warm-cream/5 rounded-xl overflow-hidden border border-warm-cream/10`}>
        {previewUrl ? (
          <SmartImage
            fallbackUrl={previewUrl}
            alt="Current image"
            ratio={ratio}
            className="w-full h-full"
            fit="contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-warm-cream/25">
            <span className="text-3xl">🖼</span>
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Uploading progress */}
      {pending && (
        <div className="flex items-center gap-2 text-xs text-warm-cream/60 bg-warm-cream/5 rounded-lg px-3 py-2">
          <div className="w-3 h-3 rounded-full border border-legend-gold border-t-transparent animate-spin flex-none" />
          {longRunning
            ? "Still working — large images take 30–60s. Don't close this tab."
            : "Processing image (generating 45 variants)…"}
        </div>
      )}

      {/* Action buttons */}
      {!pending && (
        <div className="flex flex-wrap gap-2 items-center">
          <label className="px-4 py-2 rounded-lg bg-legend-gold text-ink-black text-xs font-semibold cursor-pointer hover:bg-gold-light transition-colors">
            {previewUrl ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="px-4 py-2 rounded-lg border border-legend-gold/40 text-legend-gold text-xs font-medium hover:bg-legend-gold/10 transition-colors"
          >
            Browse library
          </button>

          {/* 3-state watermark override: null=default / true=on / false=off */}
          <button
            type="button"
            title="Override default watermark policy for this upload"
            onClick={() =>
              setWmOverride((p) => (p === null ? true : p === true ? false : null))
            }
            className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
              wmOverride === true
                ? "bg-legend-gold/20 text-legend-gold border-legend-gold/40"
                : wmOverride === false
                  ? "bg-warm-cream/5 text-warm-cream/30 border-warm-cream/15 line-through"
                  : "bg-warm-cream/5 text-warm-cream/40 border-warm-cream/15"
            }`}
          >
            {wmOverride === true ? "★ Watermark ON" : wmOverride === false ? "Watermark OFF" : "Watermark: default"}
          </button>

          {/* Watermark options panel — only when ON */}
          {wmOverride === true && (
            <div className="basis-full mt-2 p-3 rounded-xl border border-legend-gold/30 bg-legend-gold/5 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-legend-gold/80">Watermark options</p>

              {/* Position picker — 5 buttons (4 corners + center) */}
              <div className="space-y-1">
                <p className="text-[10px] text-warm-cream/50">Position</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { v: "northwest", label: "Top-left" },
                    { v: "northeast", label: "Top-right" },
                    { v: "center",    label: "Center" },
                    { v: "southwest", label: "Bottom-left" },
                    { v: "southeast", label: "Bottom-right" },
                  ].map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => setWmPosition(wmPosition === p.v ? null : p.v)}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        wmPosition === p.v
                          ? "bg-legend-gold text-ink-black border-legend-gold"
                          : "bg-warm-cream/5 text-warm-cream/60 border-warm-cream/15 hover:bg-warm-cream/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {wmPosition === null && (
                  <p className="text-[9px] text-warm-cream/40">Using site default position</p>
                )}
              </div>

              {/* Opacity slider 0-100 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-warm-cream/50">Opacity</p>
                  <p className="text-[10px] text-legend-gold tabular-nums">
                    {wmOpacity === null ? "site default" : `${wmOpacity}%`}
                  </p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={wmOpacity ?? 30}
                  onChange={(e) => setWmOpacity(Number(e.target.value))}
                  className="w-full accent-legend-gold cursor-pointer"
                />
                {wmOpacity !== null && (
                  <button
                    type="button"
                    onClick={() => setWmOpacity(null)}
                    className="text-[9px] text-warm-cream/40 hover:text-warm-cream/70 underline"
                  >
                    Reset to site default
                  </button>
                )}
              </div>
            </div>
          )}

          <a
            href="/admin/assets/upload"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-warm-cream/35 hover:text-warm-cream/60 transition-colors"
          >
            Bulk upload →
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Asset Library modal */}
      {showLibrary && (
        <AssetLibraryPickerModal
          defaultSource={source === "destination" ? "destination" : source === "tour" ? "tour" : "all"}
          onSelect={handleLibrarySelect}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
