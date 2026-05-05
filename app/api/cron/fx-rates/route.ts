import { NextRequest } from "next/server";
import { refreshFxRates } from "@/lib/currency/fx";

const SECRET = process.env.CRON_SECRET ?? "";

export async function GET(req: NextRequest) {
  if (!SECRET || req.headers.get("authorization") !== `Bearer ${SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const result = await refreshFxRates();

  if (result.error) {
    console.error("[cron/fx-rates] failed:", result.error);
    // Return 200 — cron should not be marked as failed if the API is down.
    // Rates are stale but still valid.
    return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true, updated: result.updated }), { status: 200 });
}
