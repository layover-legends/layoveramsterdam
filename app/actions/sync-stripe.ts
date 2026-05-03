"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { syncOne, syncAllOutOfSync } from "@/lib/stripe/sync";
import { revalidatePath } from "next/cache";
import type { SyncResult, ServiceKind } from "@/lib/stripe/types";

export async function syncServiceToStripe(
  kind: ServiceKind,
  id: string,
): Promise<SyncResult> {
  await requireAdmin();
  const result = await syncOne({ kind, id });
  revalidatePath("/admin/services");
  return result;
}

export async function syncAllToStripe(): Promise<{
  synced: number;
  failed: number;
  unchanged: number;
  results: SyncResult[];
}> {
  await requireAdmin();
  const results = await syncAllOutOfSync();
  revalidatePath("/admin/services");
  revalidatePath("/shop");

  const synced = results.filter((r) => r.status === "created" || r.status === "updated").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const unchanged = results.filter((r) => r.status === "unchanged").length;
  return { synced, failed, unchanged, results };
}
