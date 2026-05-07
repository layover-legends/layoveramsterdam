// Shared photo types — safe to import from both server and client files.

export type PhotoSource =
  | "tour" | "addon" | "staff" | "vehicle" | "destination" | "about"
  | "marketing" | "customer_upload" | "review";

export type CropStrategy = "center" | "attention" | "entropy" | "manual_focal";

export type ModerationStatus =
  | "auto_approved" | "pending_review" | "approved" | "rejected";

export type PhotoUsageEntityType =
  | "tour" | "addon" | "destination" | "staff" | "vehicle" | "article"
  | "about" | "review" | "testimonial" | "site_setting";

export type AspectRatio = "1:1" | "4:3" | "16:9" | "21:9" | "9:16";
export type PhotoSize = 400 | 1200 | 2400;
export type PhotoFormat = "avif" | "webp" | "jpeg";

// Variant grid: 4 ratios × 3 sizes × 2 formats = 24 variants per photo.
// Dropped 21:9 (not used in current layouts) and AVIF (slowest sharp encoder
// by ~5–10× — the dominant cost in the upload pipeline). WebP is universally
// supported and visually equivalent for our use cases.
export const ASPECT_RATIOS: { ratio: AspectRatio; w: number; h: number }[] = [
  { ratio: "1:1",  w: 1,  h: 1  },
  { ratio: "4:3",  w: 4,  h: 3  },
  { ratio: "16:9", w: 16, h: 9  },
  { ratio: "9:16", w: 9,  h: 16 },
];

export const PHOTO_SIZES: PhotoSize[] = [400, 1200, 2400];
export const PHOTO_FORMATS: PhotoFormat[] = ["webp", "jpeg"];

export type PhotoRow = {
  id: string;
  storage_path: string;
  cdn_url: string | null;
  source: PhotoSource;
  related_id: string | null;
  caption: string | null;
  alt_text: string;
  width_px: number | null;
  height_px: number | null;
  bytes: number | null;
  exif_stripped: boolean;
  uploaded_by: string | null;
  is_featured: boolean;
  is_public: boolean;
  sort_order: number;
  original_filename: string | null;
  mime_type: string | null;
  focal_point_x: number | null;
  focal_point_y: number | null;
  crop_strategy: CropStrategy;
  aspect_ratios_generated: string[];
  blurhash: string | null;
  dominant_color: string | null;
  tags: string[];
  copyright_holder: string | null;
  license_type: string | null;
  license_expires_at: string | null;
  photographer_credit: string | null;
  license_notes: string | null;
  nsfw_flag: boolean;
  moderation_status: ModerationStatus;
  moderation_notes: string | null;
  ai_alt_text_suggested: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string | null;
};

/** Aspect ratio → URL-safe filename segment. "16:9" → "16x9". */
export const ratioToFilename = (r: AspectRatio | string) => r.replace(":", "x");

/** Construct the CDN URL for a specific variant. */
export function variantUrl(
  baseStoragePath: string,
  ratio: AspectRatio,
  size: PhotoSize,
  format: PhotoFormat
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  // Filenames use `x` not `:` to avoid URL parsing issues
  const filePath = `${baseStoragePath}${ratioToFilename(ratio)}-${size}.${format}`;
  return `${supabaseUrl}/storage/v1/object/public/photos/${filePath}`;
}

/** URL for the best default CDN thumbnail (16:9 medium WebP). */
export function defaultCdnUrl(storagePath: string): string {
  return variantUrl(storagePath, "16:9", 1200, "webp");
}
