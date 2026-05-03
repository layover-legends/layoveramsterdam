import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

function escapeIcs(s: string): string {
  return s.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = createAdminClient();

  const { data: rawBooking } = await admin
    .from("bookings")
    .select(
      "id, scheduled_pickup_at, scheduled_dropoff_at, party_size, tours(name)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!rawBooking) {
    return new NextResponse("Not found", { status: 404 });
  }

  const b = rawBooking as unknown as {
    id: string;
    scheduled_pickup_at: string;
    scheduled_dropoff_at: string;
    party_size: number;
    tours: { name: string } | null;
  };

  const summary = b.tours?.name
    ? `Layover Legends — ${b.tours.name}`
    : "Layover Legends Experience";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Layover Legends//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${icsDate(b.scheduled_pickup_at)}`,
    `DTEND:${icsDate(b.scheduled_dropoff_at)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(`Party of ${b.party_size}. Meeting point: Schiphol Airport arrivals. Booking ref: ${b.id}`)}`,
    "LOCATION:Amsterdam Schiphol Airport",
    `UID:${b.id}@layover-legends.com`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="layover-legends-${b.id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
