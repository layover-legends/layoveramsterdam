import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/resolve";
import { checkIpRateLimit } from "@/lib/rate-limit/ip";

const RATE_LIMIT_MAX = 3;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { serviceId, email, hp_url } = body as {
    serviceId?: string;
    email?: string;
    hp_url?: string;
  };

  // Honeypot — bots fill hidden fields
  if (hp_url) return NextResponse.json({ ok: true });

  if (!serviceId || typeof serviceId !== "string") {
    return NextResponse.json({ ok: false, error: "missing_service_id" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const rateCheck = await checkIpRateLimit("shop_interest_rate_limits", ip, RATE_LIMIT_MAX);
  if (rateCheck.limited) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
      },
    );
  }

  const supabase = createClient();
  const locale = resolveLocale();

  const { error } = await supabase
    .from("service_interest")
    .insert({ service_id: serviceId, email: email.toLowerCase().trim(), locale });

  if (error) {
    // 23505 = unique_violation (service_id + email already exists)
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, already: true });
    }
    console.error("[shop/interest]", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
