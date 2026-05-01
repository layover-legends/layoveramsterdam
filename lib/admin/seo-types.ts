// Client-safe types for the SEO health dashboard.
// MUST NOT import server-only modules.

export type SeoIssueKind =
  | "missing_description"
  | "description_too_short"
  | "description_too_long"
  | "missing_primary_photo"
  | "missing_coords"
  | "missing_alt_text"
  | "missing_tagline"
  | "duplicate_slug"
  | "missing_meta_title"
  | "missing_meta_description";

export type SeoIssue = {
  kind: SeoIssueKind;
  label: string;
};

export type DestinationHealth = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  requires_booking: boolean | null;
  is_adult_only: boolean | null;
  issues: SeoIssue[];
};

export type TourHealth = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  issues: SeoIssue[];
};

export type SeoHealth = {
  destinations: {
    total: number;
    healthy: number;
    needsWork: number;
    counts: Record<SeoIssueKind, number>;
    items: DestinationHealth[]; // only those with at least one issue
  };
  tours: {
    total: number;
    healthy: number;
    needsWork: number;
    counts: Record<SeoIssueKind, number>;
    items: TourHealth[];
  };
};

// Description length thresholds. Google typically truncates meta descriptions
// around 155–160 chars on desktop and 120 on mobile. Anything below ~50 chars
// is too thin to communicate value.
export const DESC_MIN = 50;
export const DESC_MAX = 160;

export const ISSUE_LABELS: Record<SeoIssueKind, string> = {
  missing_description: "No description",
  description_too_short: `Description under ${DESC_MIN} chars`,
  description_too_long: `Description over ${DESC_MAX} chars (will be truncated)`,
  missing_primary_photo: "No primary photo",
  missing_coords: "No latitude/longitude",
  missing_alt_text: "Photo missing alt text",
  missing_tagline: "No tagline",
  duplicate_slug: "Slug duplicated elsewhere",
  missing_meta_title: "No custom meta title",
  missing_meta_description: "No custom meta description",
};
