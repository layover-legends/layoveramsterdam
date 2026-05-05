import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json() as {
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
    user_agent?: string;
  };

  if (!body.endpoint || !body.p256dh_key || !body.auth_key) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id:     user.id,
        endpoint:    body.endpoint,
        p256dh_key:  body.p256dh_key,
        auth_key:    body.auth_key,
        user_agent:  body.user_agent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    console.error("[push-subscription] upsert error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { endpoint } = await req.json() as { endpoint: string };
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
