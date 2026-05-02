"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { autoTranslateEntity } from "@/lib/i18n/auto-translate";

const ALLOWED_CURRENCIES = new Set(["EUR", "USD", "GBP"]);
const MAX_TAGLINE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_PRICE_CENTS = 1_000_000;
const MAX_GROUP_SIZE = 100;
const MAX_META_TITLE = 70;
const MAX_META_DESCRIPTION = 160;

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
  meta_title: string | null;
  meta_description: string | null;
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
  if (tagline && tagline.length > MAX_TAGLINE) {
    return { ok: false, error: `Tagline must be ${MAX_TAGLINE} characters or fewer.` };
  }

  const description = (formData.get("description") || "").toString().trim() || null;
  if (description && description.length > MAX_DESCRIPTION) {
    return { ok: false, error: `Description must be ${MAX_DESCRIPTION} characters or fewer.` };
  }

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
    if (Number.isNaN(n) || n < 0 || n > MAX_PRICE_CENTS) {
      return { ok: false, error: `Price must be between 0 and ${MAX_PRICE_CENTS} cents.` };
    }
    price_cents = n;
  }

  const currency = (formData.get("currency") || "EUR").toString().trim().toUpperCase() || "EUR";
  if (!ALLOWED_CURRENCIES.has(currency)) {
    return { ok: false, error: `Currency must be one of: ${[...ALLOWED_CURRENCIES].join(", ")}.` };
  }

  const groupRaw = (formData.get("max_group_size") || "").toString().trim();
  let max_group_size: number | null = null;
  if (groupRaw) {
    const n = Math.round(Number(groupRaw));
    if (Number.isNaN(n) || n < 1 || n > MAX_GROUP_SIZE) {
      return { ok: false, error: `Max group size must be between 1 and ${MAX_GROUP_SIZE}.` };
    }
    max_group_size = n;
  }

  const meta_title = (formData.get("meta_title") || "").toString().trim() || null;
  if (meta_title && meta_title.length > MAX_META_TITLE) {
    return { ok: false, error: `Meta title must be ${MAX_META_TITLE} chars or fewer.` };
  }

  const meta_description = (formData.get("meta_description") || "").toString().trim() || null;
  if (meta_description && meta_description.length > MAX_META_DESCRIPTION) {
    return { ok: false, error: `Meta description must be ${MAX_META_DESCRIPTION} chars or fewer.` };
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
      meta_title,
      meta_description,
    },
  };
}

export async function createTour(formData: FormData) {
  const admin = await requireAdmin();
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

  let translateStatus = "ok";
  try {
    const r = await autoTranslateEntity("tour", inserted.id, {
      triggeredBy: admin.id,
      triggerSource: "admin_save",
    });
    if (!r.ok) translateStatus = "partial";
  } catch {
    translateStatus = "failed";
  }

  revalidatePath("/admin/tours");
  redirect(`/admin/tours/${inserted.id}?saved=1&i18n=${translateStatus}`);
}

export async function updateTour(id: string, formData: FormData) {
  const admin = await requireAdmin();
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

  let translateStatus = "ok";
  try {
    const r = await autoTranslateEntity("tour", id, {
      triggeredBy: admin.id,
      triggerSource: "admin_save",
    });
    if (!r.ok) translateStatus = "partial";
  } catch {
    translateStatus = "failed";
  }

  revalidatePath("/admin/tours");
  revalidatePath(`/admin/tours/${id}`);
  redirect(`/admin/tours/${id}?saved=1&i18n=${translateStatus}`);
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
