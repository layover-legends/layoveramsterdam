"use server";

import { createClient } from "@/lib/supabase/server";
import type { PhotoSource } from "@/lib/photos/types";

export type PickerPhoto = {
  id: string;
  storage_path: string;
  cdn_url: string | null;
  alt_text: string;
  source: string;
  usage_count: number;
  dominant_color: string | null;
  aspect_ratios_generated: string[];
};

export type ListPhotosOptions = {
  source?: PhotoSource | "all";
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listPhotosForPicker(
  opts: ListPhotosOptions = {}
): Promise<{ photos: PickerPhoto[]; total: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { photos: [], total: 0 };

  const { data: profile } = await supabase
    .from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return { photos: [], total: 0 };

  const page     = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(96, opts.pageSize ?? 48);
  const from     = (page - 1) * pageSize;

  let qry = supabase
    .from("photos")
    .select(
      "id, storage_path, cdn_url, alt_text, source, usage_count, dominant_color, aspect_ratios_generated",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (opts.source && opts.source !== "all") qry = qry.eq("source", opts.source);
  if (opts.q?.trim()) qry = qry.or(`alt_text.ilike.%${opts.q.trim()}%,original_filename.ilike.%${opts.q.trim()}%`);

  const { data, count } = await qry;

  return {
    photos: (data ?? []) as PickerPhoto[],
    total:  count ?? 0,
  };
}
