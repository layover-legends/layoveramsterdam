import type { SupabaseClient } from "@supabase/supabase-js";

const ACCENT_MAP: Record<string, string> = {
  "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
  "ç": "c",
  "è": "e", "é": "e", "ê": "e", "ë": "e",
  "ì": "i", "í": "i", "î": "i", "ï": "i",
  "ñ": "n",
  "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o", "ø": "o", "œ": "oe",
  "ù": "u", "ú": "u", "û": "u", "ü": "u",
  "ý": "y", "ÿ": "y",
  "ß": "ss", "þ": "th", "ð": "d",
};

export function slugify(input: string, maxLength = 60): string {
  if (!input) return "";

  let s = input.toLowerCase();
  // Strip known accents first (covers the most common cases quickly)
  s = s.split("").map((ch) => ACCENT_MAP[ch] ?? ch).join("");
  // Normalize remaining unicode combining marks (e.g. ṡ, ṫ)
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Collapse anything non-alphanumeric to hyphens
  s = s.replace(/[^a-z0-9]+/g, "-");
  // Trim leading/trailing hyphens
  s = s.replace(/^-+|-+$/g, "");
  // Truncate cleanly on a word boundary
  if (s.length > maxLength) {
    s = s.substring(0, maxLength).replace(/-[^-]*$/, "");
  }
  return s;
}

export async function uniqueSlug(opts: {
  base: string;
  table: "tours" | "addons" | "destinations" | "articles";
  cityId?: string;
  excludeId?: string;
  supabase: SupabaseClient;
}): Promise<string> {
  let candidate = slugify(opts.base);
  let n = 1;

  for (;;) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = opts.supabase.from(opts.table).select("id").eq("slug", candidate);
    if (opts.cityId) query = query.eq("city_id", opts.cityId);
    if (opts.excludeId) query = query.neq("id", opts.excludeId);
    const { data } = await query.limit(1);
    if (!data || data.length === 0) return candidate;
    n++;
    candidate = `${slugify(opts.base, 55)}-${n}`;
  }
}
