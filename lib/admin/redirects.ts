import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RedirectEntityType = "destination" | "tour" | "addon" | "article";

/**
 * Upsert a 301 redirect entry and resolve any chains so we never accumulate
 * A→B→C hops. If an existing redirect already points to `oldSlug` as its
 * `new_slug`, it gets updated to point directly to `newSlug` (A→B + B→C → A→C).
 *
 * No-op if old and new slugs are the same.
 */
export async function insertSlugRedirect(opts: {
  entityType: RedirectEntityType;
  oldSlug: string;
  newSlug: string;
}) {
  if (opts.oldSlug === opts.newSlug) return;

  const admin = createAdminClient();

  // Chain-resolution: any existing entry whose target is oldSlug should now
  // point directly to newSlug so we don't accumulate redirect hops.
  await admin
    .from("slug_redirects")
    .update({ new_slug: opts.newSlug })
    .eq("entity_type", opts.entityType)
    .eq("new_slug", opts.oldSlug);

  // Upsert the direct redirect (update new_slug if the old_slug already has an entry).
  await admin.from("slug_redirects").upsert(
    {
      entity_type: opts.entityType,
      old_slug: opts.oldSlug,
      new_slug: opts.newSlug,
      reason: `Admin rename ${new Date().toISOString()}`,
    },
    { onConflict: "entity_type,old_slug" },
  );
}
