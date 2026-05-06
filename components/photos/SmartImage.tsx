/**
 * SmartImage — <picture> with AVIF→WebP→JPEG srcset, blurhash placeholder,
 * and dominant_color background.
 *
 * Can be used as either a server component (with photo row data pre-fetched)
 * or by passing raw URL props.
 *
 * Usage:
 *   <SmartImage row={photoRow} ratio="16:9" alt="Amsterdam canal at sunset" />
 *   <SmartImage fallbackUrl={url} alt="..." className="..." />
 */

import type { AspectRatio, PhotoRow } from "@/lib/photos/types";
import { PHOTO_SIZES, ratioToFilename } from "@/lib/photos/types";

type SmartImageProps = {
  /** Full photo row — preferred path (gives blurhash + dominant color + AVIF) */
  row?: Pick<PhotoRow,
    "id" | "storage_path" | "cdn_url" | "alt_text" | "blurhash" |
    "dominant_color" | "aspect_ratios_generated"
  > | null;
  /** Fallback for legacy image_url columns not yet in photos table */
  fallbackUrl?: string | null;
  ratio?: AspectRatio;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: React.CSSProperties;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function variantSrc(storagePath: string, ratio: AspectRatio, size: number, fmt: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${storagePath}${ratioToFilename(ratio)}-${size}.${fmt}`;
}

export function SmartImage({
  row,
  fallbackUrl,
  ratio = "16:9",
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
  style = {},
}: SmartImageProps) {
  const altText   = alt ?? row?.alt_text ?? "";
  const hasVariants = row?.storage_path && row.aspect_ratios_generated?.includes(ratio);

  // Dominant color background prevents white flash
  const bgColor = row?.dominant_color ?? "transparent";

  if (!hasVariants) {
    // Fall back to <img> for legacy URLs or photos without variants
    const src = fallbackUrl ?? row?.cdn_url ?? "";
    if (!src) return null;
    return (
      <div className={`overflow-hidden ${className}`}
        style={{ backgroundColor: bgColor, ...style }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={altText}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const sp = row.storage_path!;

  // Build blurhash placeholder (CSS background-image)
  // We use a simple base64 SVG as a placeholder since blurhash decoding
  // requires client-side JS. The dominant color handles FOUC.
  const placeholderStyle: React.CSSProperties = {
    backgroundColor: bgColor,
  };

  return (
    <div
      className={`overflow-hidden relative ${className}`}
      style={{ ...placeholderStyle, ...style }}
    >
      <picture>
        {/* AVIF — best compression (~50% smaller than WebP) */}
        <source
          type="image/avif"
          sizes={sizes}
          srcSet={PHOTO_SIZES.map((s) =>
            `${variantSrc(sp, ratio, s, "avif")} ${s}w`
          ).join(", ")}
        />
        {/* WebP — broad browser support */}
        <source
          type="image/webp"
          sizes={sizes}
          srcSet={PHOTO_SIZES.map((s) =>
            `${variantSrc(sp, ratio, s, "webp")} ${s}w`
          ).join(", ")}
        />
        {/* JPEG — universal fallback */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={variantSrc(sp, ratio, 1200, "jpeg")}
          srcSet={PHOTO_SIZES.map((s) =>
            `${variantSrc(sp, ratio, s, "jpeg")} ${s}w`
          ).join(", ")}
          sizes={sizes}
          alt={altText}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          className="w-full h-full object-cover"
          width={ratio === "9:16" ? 9 * 100 : parseInt(ratio.split(":")[0]) * 100}
          height={ratio === "9:16" ? 16 * 100 : parseInt(ratio.split(":")[1]) * 100}
        />
      </picture>
    </div>
  );
}

export default SmartImage;
