import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const COOLDOWN_SECONDS = 60;

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { staffName, coords, timestamp, accuracy } = await req.json() as {
    staffName: string;
    coords: { lat: number; lng: number } | null;
    timestamp: string;
    accuracy?: number | null;
  };

  const admin = createAdminClient();

  // Resolve the staff record so we can log the real staff_id
  const { data: staffRow } = await admin
    .from("staff")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle() as { data: { id: string } | null };

  // 60-second cooldown per staff member — prevents accidental double-tap
  if (staffRow) {
    const since = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString();
    const { data: recent } = await admin
      .from("sos_incidents" as "sos_incidents")
      .select("created_at")
      .eq("staff_id", staffRow.id)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle() as { data: { created_at: string } | null };

    if (recent) {
      return new Response(
        JSON.stringify({ error: "SOS already sent. Please wait before sending again." }),
        { status: 429 },
      );
    }
  }

  // Find the staff member's active assignment for context in the email
  const { data: activeAssignment } = staffRow
    ? await admin
        .from("assignments" as "assignments")
        .select("id, booking:bookings(id, customer_name, tour:tours(name))")
        .eq("staff_id", staffRow.id)
        .not("started_at", "is", null)
        .is("completed_at", null)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const assignment = activeAssignment as {
    id: string;
    booking: { id: string; customer_name: string | null; tour: { name: string } | null } | null;
  } | null;

  // Read emergency contact from site_settings; fall back to env var then hardcode
  const { data: settingRow } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "contact_email")
    .maybeSingle() as { data: { value: string | null } | null };

  const recipientEmail =
    settingRow?.value ??
    process.env.SOS_RECIPIENT_EMAIL ??
    "travellayoverlegends@gmail.com";

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  // Insert incident record (resolved later via admin dashboard)
  const { data: incident } = await admin
    .from("sos_incidents" as "sos_incidents")
    .insert({
      staff_id:     staffRow?.id ?? null,
      user_id:      user.id,
      booking_id:   assignment?.booking?.id ?? null,
      assignment_id: assignment?.id ?? null,
      latitude:     coords?.lat ?? null,
      longitude:    coords?.lng ?? null,
      accuracy_m:   accuracy ?? null,
      ip_address:   ip,
      user_agent:   ua,
    })
    .select("id")
    .single() as { data: { id: string } | null };

  const mapsLink = coords
    ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
    : null;

  const localTime = new Date(timestamp).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <h2 style="color:#c0392b;margin:0 0 16px">🆘 SOS ALERT — Driver Emergency</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">Driver</td>
          <td style="padding:4px 0"><strong>${staffName}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Time (AMS)</td>
          <td style="padding:4px 0">${localTime}</td></tr>
      ${coords ? `
      <tr><td style="padding:4px 12px 4px 0;color:#666">GPS</td>
          <td style="padding:4px 0">
            <a href="${mapsLink}" style="color:#c0392b;font-weight:bold">
              Open in Google Maps →
            </a>
            <span style="color:#999;font-size:12px;margin-left:8px">
              (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}
              ${accuracy ? ` ±${Math.round(accuracy)}m` : ""})
            </span>
          </td></tr>` : `
      <tr><td style="padding:4px 12px 4px 0;color:#666">GPS</td>
          <td style="padding:4px 0;color:#999">Not available</td></tr>`}
      ${assignment?.booking ? `
      <tr><td style="padding:4px 12px 4px 0;color:#666">Active tour</td>
          <td style="padding:4px 0">
            ${assignment.booking.tour?.name ?? "Unknown tour"}
            ${assignment.booking.customer_name ? ` · Customer: ${assignment.booking.customer_name}` : ""}
          </td></tr>` : ""}
      ${incident ? `
      <tr><td style="padding:4px 12px 4px 0;color:#666">Incident ref</td>
          <td style="padding:4px 0;font-family:monospace;font-size:12px">${incident.id}</td></tr>` : ""}
    </table>
    <hr style="margin:20px 0;border:none;border-top:1px solid #eee"/>
    <p style="color:#666;font-size:12px;margin:0">
      Sent from the Layover Legends Driver app. Resolve this incident in the admin panel.
    </p>
  `;

  try {
    const resend = getResend();
    await resend.emails.send({
      from:    "Layover Legends Alert <no-reply@layover-legends.com>",
      to:      recipientEmail,
      subject: `🆘 SOS — ${staffName} — ${localTime}`,
      html,
    });
  } catch (err) {
    console.error("[SOS] email failed:", err);
    // Still return ok=true — the incident row is saved; admin can see it in dashboard
  }

  return new Response(JSON.stringify({ ok: true, incidentId: incident?.id ?? null }), {
    status: 200,
  });
}
