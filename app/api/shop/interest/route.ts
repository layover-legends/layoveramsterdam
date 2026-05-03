import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/resolve";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { serviceId, email } = body as { serviceId?: string; email?: string };

  if (!serviceId || typeof serviceId !== "string") {
    return NextResponse.json({ ok: false, error: "missing_service_id" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
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
