import "server-only";

import { getStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SyncResult, ServiceKind } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function syncOne(opts: {
  kind: ServiceKind;
  id: string;
}): Promise<SyncResult> {
  const admin = createAdminClient();
  const table = opts.kind === "tour" ? "tours" : "addons";

  const { data: raw } = await admin
    .from(table)
    .select(
      "id, name, description, price_cents, vat_rate, slug, image_url, stripe_product_id, stripe_price_id, updated_at, stripe_synced_at",
    )
    .eq("id", opts.id)
    .maybeSingle();

  if (!raw) return fail(opts.id, opts.kind, "Row not found");

  const row = raw as {
    id: string;
    name: string | null;
    description: string | null;
    price_cents: number;
    vat_rate: number;
    slug: string;
    image_url: string | null;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
    updated_at: string | null;
    stripe_synced_at: string | null;
  };

  // Already in sync (nothing changed since last sync)
  if (
    row.stripe_product_id &&
    row.stripe_price_id &&
    row.stripe_synced_at &&
    row.updated_at &&
    new Date(row.updated_at) <= new Date(row.stripe_synced_at)
  ) {
    return {
      service_id: opts.id,
      service_kind: opts.kind,
      product_id: row.stripe_product_id,
      price_id: row.stripe_price_id,
      old_price_id: null,
      status: "unchanged",
    };
  }

  try {
    // Always update Product (idempotent: name, description, images)
    const productId = await ensureProduct(row);

    // Only create a new Price if amount changed vs current active Price
    const { newPriceId, oldPriceId, priceRotated } = await rotatePrice(
      productId,
      row.price_cents,
      Number(row.vat_rate),
      row.stripe_price_id,
    );

    const isCreated = !row.stripe_product_id;

    await admin
      .from(table)
      .update({
        stripe_product_id: productId,
        stripe_price_id: newPriceId,
        stripe_synced_at: new Date().toISOString(),
        stripe_sync_error: null,
      })
      .eq("id", opts.id);

    return {
      service_id: opts.id,
      service_kind: opts.kind,
      product_id: productId,
      price_id: newPriceId,
      old_price_id: oldPriceId,
      status: isCreated ? "created" : priceRotated ? "updated" : "unchanged",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from(table)
      .update({ stripe_sync_error: message })
      .eq("id", opts.id);
    return fail(opts.id, opts.kind, message);
  }
}

/** Sync every row where stripe_synced_at IS NULL or updated_at > stripe_synced_at. */
export async function syncAllOutOfSync(): Promise<SyncResult[]> {
  const admin = createAdminClient();

  const [toursRes, addonsRes] = await Promise.all([
    admin
      .from("tours")
      .select("id, stripe_synced_at, updated_at")
      .eq("is_active", true),
    admin
      .from("addons")
      .select("id, stripe_synced_at, updated_at")
      .eq("is_active", true)
      .eq("availability_status", "active"),
  ]);

  type Row = { id: string; stripe_synced_at: string | null; updated_at: string | null };

  function needsSync(r: Row) {
    return !r.stripe_synced_at || (r.updated_at && new Date(r.updated_at) > new Date(r.stripe_synced_at));
  }

  const tourIds = ((toursRes.data ?? []) as Row[]).filter(needsSync).map((r) => r.id);
  const addonIds = ((addonsRes.data ?? []) as Row[]).filter(needsSync).map((r) => r.id);

  const results = await Promise.allSettled([
    ...tourIds.map((id) => syncOne({ kind: "tour", id })),
    ...addonIds.map((id) => syncOne({ kind: "addon", id })),
  ]);

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : fail("unknown", "addon", String((r as PromiseRejectedResult).reason)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function ensureProduct(row: {
  stripe_product_id: string | null;
  name: string | null;
  description: string | null;
  slug: string;
  image_url: string | null;
}): Promise<string> {
  const images = row.image_url ? [row.image_url] : [];

  if (row.stripe_product_id) {
    // Products ARE mutable — update name, description, images
    await getStripe().products.update(row.stripe_product_id, {
      name: row.name ?? row.slug,
      description: row.description ?? undefined,
      images,
    });
    return row.stripe_product_id;
  }

  const product = await getStripe().products.create({
    name: row.name ?? row.slug,
    description: row.description ?? undefined,
    images,
    metadata: { slug: row.slug },
  });
  return product.id;
}

/**
 * Create a new Price only if the current active Price has a different amount.
 * Prices are immutable — if the amount matches, we reuse the existing Price.
 */
async function rotatePrice(
  productId: string,
  priceCents: number,
  vatRate: number,
  oldPriceId: string | null,
): Promise<{ newPriceId: string; oldPriceId: string | null; priceRotated: boolean }> {
  // Check if the current Price already matches to avoid unnecessary rotation
  if (oldPriceId) {
    try {
      const existing = await getStripe().prices.retrieve(oldPriceId);
      if (existing.unit_amount === priceCents && existing.active) {
        return { newPriceId: oldPriceId, oldPriceId: null, priceRotated: false };
      }
    } catch {
      // Price not found or unreachable — proceed to create a new one
    }
  }

  const newPrice = await getStripe().prices.create({
    product: productId,
    unit_amount: priceCents,
    currency: "eur",
    tax_behavior: "inclusive",
    metadata: { vat_rate: String(vatRate) },
  });

  if (oldPriceId && oldPriceId !== newPrice.id) {
    await getStripe().prices.update(oldPriceId, { active: false }).catch(() => {});
  }

  return { newPriceId: newPrice.id, oldPriceId, priceRotated: true };
}

function fail(id: string, kind: ServiceKind, error: string): SyncResult {
  return {
    service_id: id,
    service_kind: kind,
    product_id: null,
    price_id: null,
    old_price_id: null,
    status: "failed",
    error,
  };
}
