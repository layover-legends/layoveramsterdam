import { createClient } from "@/lib/supabase/server";
import type {
  ArticleHealth,
  DestinationHealth,
  SeoHealth,
  SeoIssue,
  SeoIssueKind,
  TourHealth,
} from "@/lib/admin/seo-types";
import { DESC_MIN, DESC_MAX, ISSUE_LABELS } from "@/lib/admin/seo-types";

export type {
  ArticleHealth,
  DestinationHealth,
  SeoHealth,
  SeoIssue,
  SeoIssueKind,
  TourHealth,
} from "@/lib/admin/seo-types";
export { DESC_MIN, DESC_MAX, ISSUE_LABELS } from "@/lib/admin/seo-types";

type DestRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  requires_booking: boolean | null;
  is_adult_only: boolean | null;
  meta_title: string | null;
  meta_description: string | null;
  stop_photos: Array<{ id: string; alt_text: string | null; is_primary: boolean | null }> | null;
};

type TourRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
};

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  excerpt: string | null;
  cover_url: string | null;
  body_md: string;
  meta_title: string | null;
  meta_description: string | null;
};

function makeIssue(kind: SeoIssueKind): SeoIssue {
  return { kind, label: ISSUE_LABELS[kind] };
}

function emptyCounts(): Record<SeoIssueKind, number> {
  return {
    missing_description: 0,
    description_too_short: 0,
    description_too_long: 0,
    missing_primary_photo: 0,
    missing_coords: 0,
    missing_alt_text: 0,
    missing_tagline: 0,
    duplicate_slug: 0,
    missing_meta_title: 0,
    missing_meta_description: 0,
    missing_excerpt: 0,
    missing_cover: 0,
    body_too_short: 0,
    missing_og_image: 0,
  };
}

export async function getSeoHealth(): Promise<SeoHealth> {
  const supabase = createClient();

  const [{ data: dRows }, { data: tRows }, { data: aRows }] = await Promise.all([
    supabase
      .from("destinations")
      .select(
        "id, name, slug, description, latitude, longitude, is_active, requires_booking, is_adult_only, meta_title, meta_description, stop_photos ( id, alt_text, is_primary )",
      )
      .order("name", { ascending: true }),
    supabase
      .from("tours")
      .select("id, name, slug, tagline, description, is_active, meta_title, meta_description")
      .order("name", { ascending: true }),
    supabase
      .from("articles")
      .select("id, title, slug, is_published, excerpt, cover_url, body_md, meta_title, meta_description")
      .order("title", { ascending: true }),
  ]);

  const dests = (dRows ?? []) as unknown as DestRow[];
  const tours = (tRows ?? []) as unknown as TourRow[];
  const articles = (aRows ?? []) as unknown as ArticleRow[];

  // ── destinations ────────────────────────────────────────────────────────

  const slugSeen = new Map<string, number>();
  for (const d of dests) slugSeen.set(d.slug, (slugSeen.get(d.slug) ?? 0) + 1);

  const dCounts = emptyCounts();
  const dItems: DestinationHealth[] = [];

  for (const d of dests) {
    const issues: SeoIssue[] = [];

    if (!d.description) issues.push(makeIssue("missing_description"));
    else {
      if (d.description.length < DESC_MIN) issues.push(makeIssue("description_too_short"));
      if (d.description.length > DESC_MAX) issues.push(makeIssue("description_too_long"));
    }

    const photos = d.stop_photos ?? [];
    const hasPrimary = photos.some((p) => p.is_primary);
    if (!hasPrimary) {
      issues.push(makeIssue("missing_primary_photo"));
      issues.push(makeIssue("missing_og_image"));
    }
    if (photos.some((p) => !p.alt_text)) issues.push(makeIssue("missing_alt_text"));
    if (d.latitude === null || d.longitude === null) issues.push(makeIssue("missing_coords"));
    if ((slugSeen.get(d.slug) ?? 0) > 1) issues.push(makeIssue("duplicate_slug"));
    if (!d.meta_title) issues.push(makeIssue("missing_meta_title"));
    if (!d.meta_description) issues.push(makeIssue("missing_meta_description"));

    for (const i of issues) dCounts[i.kind] += 1;
    if (issues.length > 0) {
      dItems.push({ id: d.id, name: d.name, slug: d.slug, is_active: d.is_active, requires_booking: d.requires_booking, is_adult_only: d.is_adult_only, issues });
    }
  }

  // ── tours ────────────────────────────────────────────────────────────────

  const tCounts = emptyCounts();
  const tItems: TourHealth[] = [];

  for (const t of tours) {
    const issues: SeoIssue[] = [];
    if (!t.tagline) issues.push(makeIssue("missing_tagline"));
    if (!t.description) issues.push(makeIssue("missing_description"));
    else {
      if (t.description.length < DESC_MIN) issues.push(makeIssue("description_too_short"));
      if (t.description.length > DESC_MAX) issues.push(makeIssue("description_too_long"));
    }
    if (!t.meta_title) issues.push(makeIssue("missing_meta_title"));
    if (!t.meta_description) issues.push(makeIssue("missing_meta_description"));
    // Tours use the dynamic /og route so missing_og_image is not flagged here.

    for (const i of issues) tCounts[i.kind] += 1;
    if (issues.length > 0) {
      tItems.push({ id: t.id, name: t.name, slug: t.slug, is_active: t.is_active, issues });
    }
  }

  // ── articles ─────────────────────────────────────────────────────────────

  const aCounts = emptyCounts();
  const aItems: ArticleHealth[] = [];
  const published = articles.filter((a) => a.is_published).length;

  for (const a of articles) {
    const issues: SeoIssue[] = [];
    if (!a.excerpt) issues.push(makeIssue("missing_excerpt"));
    if (!a.cover_url) {
      issues.push(makeIssue("missing_cover"));
      issues.push(makeIssue("missing_og_image"));
    }
    if (a.body_md.trim().length < 300) issues.push(makeIssue("body_too_short"));
    if (!a.meta_title) issues.push(makeIssue("missing_meta_title"));
    if (!a.meta_description) issues.push(makeIssue("missing_meta_description"));

    for (const i of issues) aCounts[i.kind] += 1;
    if (issues.length > 0) {
      aItems.push({ id: a.id, title: a.title, slug: a.slug, is_published: a.is_published, issues });
    }
  }

  return {
    destinations: {
      total: dests.length,
      needsWork: dItems.length,
      healthy: dests.length - dItems.length,
      counts: dCounts,
      items: dItems,
    },
    tours: {
      total: tours.length,
      needsWork: tItems.length,
      healthy: tours.length - tItems.length,
      counts: tCounts,
      items: tItems,
    },
    articles: {
      total: articles.length,
      published,
      drafts: articles.length - published,
      needsWork: aItems.length,
      counts: aCounts,
      items: aItems,
    },
  };
}
