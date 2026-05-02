import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/locales";

type TrackCtx = {
  user_id?: string | null;
  locale?: Locale | null;
  city_id?: string | null;
  session_id?: string | null;
};

/**
 * Fire-and-forget analytics event insert. Never throws — analytics must
 * never break the user flow. Uses service-role client to bypass RLS so
 * events are captured regardless of auth state.
 *
 * Rich props enable smart pricing and funnel analysis (Blueprint+ A3).
 */
export function track(
  event_name: string,
  props: Record<string, unknown> = {},
  ctx: TrackCtx = {},
): void {
  const h = headers();
  const supabase = createAdminClient();

  void supabase
    .from("analytics_events")
    .insert({
      event_name,
      props,
      user_id: ctx.user_id ?? null,
      session_id: ctx.session_id ?? null,
      locale: ctx.locale ?? null,
      city_id: ctx.city_id ?? null,
      url: h.get("x-pathname") ?? h.get("referer") ?? null,
      referrer: h.get("referer") ?? null,
      user_agent: h.get("user-agent") ?? null,
      ip_country: h.get("x-vercel-ip-country") ?? null,
    })
    .then();
}
