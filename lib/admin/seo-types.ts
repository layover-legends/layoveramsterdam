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
  | "missing_meta_description"
  | "missing_excerpt"
  | "missing_cover"
  | "body_too_short"
  | "missing_og_image"
  | "missing_translation_fr"
  | "missing_translation_nl"
  | "missing_translation_de"
  | "missing_translation_es"
  | "missing_translation_it"
  | "missing_translation_pt"
  | "missing_translation_zh";

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

export type ArticleHealth = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  issues: SeoIssue[];
};

export type SeoHealth = {
  destinations: {
    total: number;
    healthy: number;
    needsWork: number;
    counts: Record<SeoIssueKind, number>;
    items: DestinationHealth[];
  };
  tours: {
    total: number;
    healthy: number;
    needsWork: number;
    counts: Record<SeoIssueKind, number>;
    items: TourHealth[];
  };
  articles: {
    total: number;
    published: number;
    drafts: number;
    needsWork: number;
    counts: Record<SeoIssueKind, number>;
    items: ArticleHealth[];
  };
};

// ─── Translation coverage monitoring ──────────────────────────────────────

export const TRANSLATION_LOCALES = [
  "fr",
  "nl",
  "de",
  "es",
  "it",
  "pt",
  "zh",
] as const;
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

export const TRANSLATION_FIELDS = {
  destination: ["name", "description", "area"] as const,
  tour: ["name", "description", "tagline"] as const,
  article: ["title", "excerpt", "body_md"] as const,
} as const;

export type EntityKind = keyof typeof TRANSLATION_FIELDS;

export type LocaleEntityCoverage = {
  /** Distinct (entity_id, field) rows present for this (locale, entity). */
  covered: number;
  /** Total expected = entity_count × applicable_field_count. */
  expected: number;
  /** covered / expected, 0..1 (1 = fully covered). */
  ratio: number;
};

export type TranslationCoverage = {
  /** Per-locale, per-entity coverage. */
  byLocale: Record<TranslationLocale, Record<EntityKind, LocaleEntityCoverage>>;
  /** Aggregate breakdown by translation source. */
  bySource: {
    human: number;
    ai: number;
    imported: number;
  };
  /** Rows whose source has changed since they were translated. */
  stale: number;
  /** Total non-EN translation rows in the table. */
  total: number;
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
  missing_excerpt: "No excerpt",
  missing_cover: "No cover image",
  body_too_short: "Body under 300 chars",
  missing_og_image: "No OG image (sharing preview will use default)",
  missing_translation_fr: "No French translation",
  missing_translation_nl: "No Dutch translation",
  missing_translation_de: "No German translation",
  missing_translation_es: "No Spanish translation",
  missing_translation_it: "No Italian translation",
  missing_translation_pt: "No Portuguese translation",
  missing_translation_zh: "No Chinese translation",
};
