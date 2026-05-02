import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestSnapshots } from "@/lib/admin/health/persistence";
import { runAllChecks, runOneCheck } from "@/lib/admin/health/runner";
import type { ServiceName } from "@/lib/admin/health/types";

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

/** GET — return latest snapshots from DB */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const snapshots = await getLatestSnapshots();
    return NextResponse.json({ snapshots, refreshed_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}

/** POST — force fresh check. Body: { service?: string } */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let service: ServiceName | undefined;
  try {
    const body = (await req.json()) as { service?: string };
    if (body.service) service = body.service as ServiceName;
  } catch {
    // No body or invalid JSON — check all
  }

  try {
    const results = service
      ? [await runOneCheck(service)]
      : await runAllChecks();
    return NextResponse.json({ results, checked_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Check failed" },
      { status: 500 },
    );
  }
}
