import { createClient } from "@/lib/supabase/server";
import type {
  DestinationHealth,
  SeoHealth,
  SeoIssue,
  SeoIssueKind,
  TourHealth,
} from "@/lib/admin/seo-types";
import { DESC_MIN, DESC_MAX, ISSUE_LABELS } from "@/lib/admin/seo-types";

export type {
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
  stop_photos: Array<{ id: string; alt_text: string | null; is_primary: boolean | null }> | null;
};

type TourRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  is_active: boolean;
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
  };
}

/**
 * Compute a complete SEO-health snapshot of the catalog.
 *
 * Reads every destination + photo manifest + every tour. Doable in two queries
 * because the catalog is bounded (a few hundred rows). Computes issues in JS
 * so we can present a per-row punch list, not just aggregate counts.
 */
export async function getSeoHealth(): Promise<SeoHealth> {
  const supabase = createClient();

  const [{ data: dRows }, { data: tRows }] = await Promise.all([
    supabase
      .from("destinations")
      .select(
        "id, name, slug, description, latitude, longitude, is_active, requires_booking, is_adult_only, stop_photos ( id, alt_text, is_primary )",
      )
      .order("name", { ascending: true }),
    supabase
      .from("tours")
      .select("id, name, slug, tagline, description, is_active")
      .order("name", { ascending: true }),
  ]);

  const dests = (dRows ?? []) as unknown as DestRow[];
  const tours = (tRows ?? []) as unknown as TourRow[];

  // Slug duplicate detection — across destinations only (tours have their own
  // namespace so a tour and a destination can share a slug without conflict).
  const slugSeen = new Map<string, number>();
  for (const d of dests) {
    slugSeen.set(d.slug, (slugSeen.get(d.slug) ?? 0) + 1);
  }

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
    if (!hasPrimary) issues.push(makeIssue("missing_primary_photo"));
    if (photos.some((p) => !p.alt_text)) issues.push(makeIssue("missing_alt_text"));

    if (d.latitude === null || d.longitude === null) {
      issues.push(makeIssue("missing_coords"));
    }

    if ((slugSeen.get(d.slug) ?? 0) > 1) {
      issues.push(makeIssue("duplicate_slug"));
    }

    for (const i of issues) dCounts[i.kind] += 1;

    if (issues.length > 0) {
      dItems.push({
        id: d.id,
        name: d.name,
        slug: d.slug,
        is_active: d.is_active,
        requires_booking: d.requires_booking,
        is_adult_only: d.is_adult_only,
        issues,
      });
    }
  }

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

    for (const i of issues) tCounts[i.kind] += 1;

    if (issues.length > 0) {
      tItems.push({
        id: t.id,
        name: t.name,
        slug: t.slug,
        is_active: t.is_active,
        issues,
      });
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
  };
}
