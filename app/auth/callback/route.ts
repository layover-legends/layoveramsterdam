import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the OAuth redirect back from Google.
// Supabase sends ?code=... — we exchange it for a session cookie, then send the user home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Stamp GDPR consent on first login (GDPR Art. 7).
      // The privacy notice is shown on the homepage before the user clicks
      // "Sign in with Google", so proceeding constitutes informed consent.
      if (data.user) {
        await supabase
          .from("users")
          .update({ gdpr_accepted_at: new Date().toISOString() })
          .eq("id", data.user.id)
          .is("gdpr_accepted_at", null); // only stamp on first login
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — bounce back home with a flag the UI can read.
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
