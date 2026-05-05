"use client";

import { useState, useTransition } from "react";
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
  onUploadComplete?: (result: { photo_id: string; cdn_url: string }) => void;
};

export function PhotoUploader({
  source,
  entityType,
  entityId,
  fieldName,
  currentLegacyUrl,
  ratio = "16:9",
  onUploadComplete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError]           = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLegacyUrl ?? null);

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
      ""
    );
    if (!altText || altText.trim().length < 3) {
      setError("Alt text is required (min 3 chars). Upload cancelled.");
      return;
    }

    startTransition(async () => {
      const result = await uploadPhoto({
        file,
        alt_text: altText.trim(),
        source,
        entity_type:      entityType,
        entity_id:        entityId,
        field_name:       fieldName,
        replace_existing: true,
      });

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
          Processing image (generating 45 variants)…
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
