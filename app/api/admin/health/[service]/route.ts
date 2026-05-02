import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestSnapshots, getServiceHistory } from "@/lib/admin/health/persistence";
import { ALL_SERVICES, type ServiceName } from "@/lib/admin/health/types";

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

type RouteParams = { params: { service: string } };

/** GET /api/admin/health/[service] — latest + 24h history */
export async function GET(_req: Request, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = params.service as ServiceName;
  if (!ALL_SERVICES.includes(service)) {
    return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  }

  try {
    const [allLatest, history] = await Promise.all([
      getLatestSnapshots(),
      getServiceHistory(service, 24),
    ]);

    const latest = allLatest.find((s) => s.service === service) ?? null;

    return NextResponse.json({ latest, history });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}
