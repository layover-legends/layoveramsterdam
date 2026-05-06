"use client";

/**
 * Drop-in for server-action forms that need image upload.
 * Renders <PhotoUploader> + a hidden input (and optional manual URL fallback)
 * so the parent form action can still read the URL via formData.get(name).
 */

import { useState } from "react";
import { PhotoUploader } from "@/components/photos/PhotoUploader";
import type { PhotoSource, PhotoUsageEntityType, AspectRatio } from "@/lib/photos/types";

type Props = {
  /** FormData key the parent form action reads */
  name: string;
  defaultValue?: string | null;
  source: PhotoSource;
  entityType?: PhotoUsageEntityType;
  entityId?: string;
  fieldName?: string;
  ratio?: AspectRatio;
  label?: string;
  defaultAltText?: string;
};

export function PhotoUrlField({
  name,
  defaultValue,
  source,
  entityType,
  entityId,
  fieldName,
  ratio = "16:9",
  label,
  defaultAltText,
}: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs uppercase tracking-wide text-warm-cream/60 font-medium">{label}</p>
      )}

      <PhotoUploader
        source={source}
        entityType={entityType}
        entityId={entityId}
        fieldName={fieldName}
        currentLegacyUrl={url || null}
        ratio={ratio}
        defaultAltText={defaultAltText}
        onUploadComplete={(r) => setUrl(r.cdn_url)}
      />

      {/* Hidden input carries the URL into the form submission */}
      <input type="hidden" name={name} value={url} />

      {/* Manual URL override — useful for external logos */}
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Or paste image URL directly…"
        className="w-full px-3 py-2 rounded-lg bg-warm-cream/5 border border-warm-cream/10 text-xs text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:border-legend-gold/40 transition-colors"
      />
    </div>
  );
}
