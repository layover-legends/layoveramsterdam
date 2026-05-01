// Glossary loader. Server-only.
//
// Accepts an optional supabase client so it works from both:
//   - Server Components / Server Actions (omit the arg, uses the SSR client)
//   - CLI scripts using a service-role client (pass it in)

import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/locales";
import type { GlossaryEntry } from "@/lib/i18n/providers/types";

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        eq: (
          col: string,
          val: string,
        ) => {
          order: (col: string) => Promise<{ data: GlossaryEntry[] | null }>;
        };
      };
    };
  };
};

/**
 * Load all glossary entries that map English source terms to `target` locale.
 * Returns an empty array on miss — never throws.
 */
export async function loadGlossary(
  target: Locale,
  client?: SupabaseLike,
): Promise<GlossaryEntry[]> {
  const supabase = (client ?? createClient()) as unknown as SupabaseLike;
  const { data } = await supabase
    .from("translation_glossary")
    .select(
      "source_term, target_term, do_not_translate, case_sensitive",
    )
    .eq("source_lang", "en")
    .eq("target_lang", target)
    .order("source_term");
  return (data ?? []) as GlossaryEntry[];
}
