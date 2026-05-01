"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  searchAddableDestinations,
  type AddableDestination,
} from "@/lib/admin/tour-stops";

type Ok = { ok: true };
type Err = { ok: false; error: string };

export async function reorderTourStops(
  tourId: string,
  orderedStopIds: string[],
): Promise<Ok | Err> {
  await requireAdmin();
  const supabase = createClient();

  // Validate: the supplied ids must be exactly the current set for this tour.
  const { data: current } = await supabase
    .from("tour_stops")
    .select("id")
    .eq("tour_id", tourId);

  const currentIds = new Set((current ?? []).map((r) => r.id));
  const suppliedIds = new Set(orderedStopIds);

  if (
    currentIds.size !== suppliedIds.size ||
    [...currentIds].some((id) => !suppliedIds.has(id))
  ) {
    return { ok: false, error: "Stop list is out of sync — refresh and try again." };
  }

  // Bulk-update stop_order (sequential; admin tool, typically ≤ 20 stops).
  for (let i = 0; i < orderedStopIds.length; i++) {
    const { error } = await supabase
      .from("tour_stops")
      .update({ stop_order: i })
      .eq("id", orderedStopIds[i])
      .eq("tour_id", tourId);
    if (error) return { ok: false, error: "Reorder failed: " + error.message };
  }

  revalidatePath(`/admin/tours/${tourId}`);
  revalidatePath("/admin/tours");
  return { ok: true };
}

export async function addStopToTour(
  tourId: string,
  destinationId: string,
): Promise<{ ok: true; id: string } | Err> {
  await requireAdmin();
  const supabase = createClient();

  // Compute next stop_order.
  const { data: last } = await supabase
    .from("tour_stops")
    .select("stop_order")
    .eq("tour_id", tourId)
    .order("stop_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = last ? (last.stop_order ?? 0) + 1 : 0;

  const { data: inserted, error } = await supabase
    .from("tour_stops")
    .insert({
      tour_id: tourId,
      destination_id: destinationId,
      stop_order: nextOrder,
      is_optional: false,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Could not add stop." };
  }

  revalidatePath(`/admin/tours/${tourId}`);
  revalidatePath("/admin/tours");
  return { ok: true, id: inserted.id };
}

export async function removeTourStop(
  tourStopId: string,
  tourId: string,
): Promise<Ok | Err> {
  await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("tour_stops")
    .delete()
    .eq("id", tourStopId)
    .eq("tour_id", tourId);

  if (error) return { ok: false, error: "Remove failed: " + error.message };

  revalidatePath(`/admin/tours/${tourId}`);
  revalidatePath("/admin/tours");
  return { ok: true };
}

export async function updateTourStop(
  tourStopId: string,
  tourId: string,
  fields: {
    is_optional?: boolean;
    duration_override?: number | null;
    notes?: string | null;
  },
): Promise<Ok | Err> {
  await requireAdmin();

  if (
    fields.duration_override !== undefined &&
    fields.duration_override !== null &&
    (fields.duration_override < 1 || fields.duration_override > 480)
  ) {
    return { ok: false, error: "Duration must be between 1 and 480 minutes." };
  }

  if (
    fields.notes !== undefined &&
    fields.notes !== null &&
    fields.notes.length > 500
  ) {
    return { ok: false, error: "Notes must be 500 characters or fewer." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("tour_stops")
    .update(fields)
    .eq("id", tourStopId)
    .eq("tour_id", tourId);

  if (error) return { ok: false, error: "Update failed: " + error.message };

  revalidatePath(`/admin/tours/${tourId}`);
  return { ok: true };
}

// Exposed to the client component for the destination picker.
export async function searchDestinationsForTour(
  tourId: string,
  q: string,
): Promise<AddableDestination[]> {
  await requireAdmin();
  return searchAddableDestinations(tourId, q);
}
