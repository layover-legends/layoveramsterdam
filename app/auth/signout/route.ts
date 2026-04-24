import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /auth/signout — clear the Supabase session and bounce home.
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, {
    // 303 forces the browser to follow the redirect as a GET.
    status: 303,
  });
}
