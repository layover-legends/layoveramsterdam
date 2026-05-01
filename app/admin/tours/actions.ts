"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

type Parsed = {
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  duration_hours: number | null;
  price_cents: number | null;
  currency: string;
  max_group_size: number | null;
  is_active: boolean;
  requires_booking: boolean;
  is_adult_only: boolean;
  is_seasonal: boolean;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTour(
  formData: FormData,
): { ok: true; data: Parsed } | { ok: false; error: string } {
  const name = (formData.get("name") || "").toString().trim();
  if (!name || name.length > 200) {
    return { ok: false, error: "Name is required (1–200 characters)." };
  }

  const slugRaw = (formData.get("slug") || "").toString().trim();
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) {
    return { ok: false, error: "Could not generate a slug from this name." };
  }

  const tagline = (formData.get("tagline") || "").toString().trim() || null;
  const description = (formData.get("description") || "").toString().trim() || null;

  const durRaw = (formData.get("duration_hours") || "").toString().trim();
  let duration_hours: number | null = null;
  if (durRaw) {
    const n = Number(durRaw);
    if (Number.isNaN(n) || n <= 0 || n > 24) {
      return { ok: false, error: "Duration must be between 0.5 and 24 hours." };
    }
    duration_hours = n;
  }

  const priceRaw = (formData.get("price_cents") || "").toString().trim();
  let price_cents: number | null = null;
  if (priceRaw) {
    const n = Math.round(Number(priceRaw));
    if (Number.isNaN(n) || n < 0) {
      return { ok: false, error: "Price must be a positive number." };
    }
    price_cents = n;
  }

  const currency = (formData.get("currency") || "EUR").toString().trim() || "EUR";

  const groupRaw = (formData.get("max_group_size") || "").toString().trim();
  let max_group_size: number | null = null;
  if (groupRaw) {
    const n = Math.round(Number(groupRaw));
    if (Number.isNaN(n) || n < 1) {
      return { ok: false, error: "Max group size must be at least 1." };
    }
    max_group_size = n;
  }

  return {
    ok: true,
    data: {
      name,
      slug,
      tagline,
      description,
      duration_hours,
      price_cents,
      currency,
      max_group_size,
      is_active: formData.get("is_active") === "on",
      requires_booking: formData.get("requires_booking") === "on",
      is_adult_only: formData.get("is_adult_only") === "on",
      is_seasonal: formData.get("is_seasonal") === "on",
    },
  };
}

export async function createTour(formData: FormData) {
  await requireAdmin();
  const parsed = parseTour(formData);
  if (!parsed.ok) {
    redirect(`/admin/tours/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from("tours")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !inserted) {
    redirect(
      `/admin/tours/new?error=${encodeURIComponent(error?.message ?? "Could not create tour")}`,
    );
  }

  revalidatePath("/admin/tours");
  redirect(`/admin/tours/${inserted.id}?saved=1`);
}

export async function updateTour(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseTour(formData);
  if (!parsed.ok) {
    redirect(`/admin/tours/${id}?error=${encodeURIComponent(parsed.error)}`);
  }

  const supabase = createClient();
  const { error } = await supabase.from("tours").update(parsed.data).eq("id", id);
  if (error) {
    redirect(
      `/admin/tours/${id}?error=${encodeURIComponent("Save failed: " + error.message)}`,
    );
  }

  revalidatePath("/admin/tours");
  revalidatePath(`/admin/tours/${id}`);
  redirect(`/admin/tours/${id}?saved=1`);
}

export async function deleteTour(id: string) {
  await requireAdmin();
  const supabase = createClient();

  // tour_stops are deleted by ON DELETE CASCADE on the DB.
  const { error } = await supabase.from("tours").delete().eq("id", id);
  if (error) {
    redirect(
      `/admin/tours/${id}?error=${encodeURIComponent("Delete failed: " + error.message)}`,
    );
  }

  revalidatePath("/admin/tours");
  redirect("/admin/tours?deleted=1");
}
