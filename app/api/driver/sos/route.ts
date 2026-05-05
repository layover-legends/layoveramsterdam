import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { staffName, coords, timestamp } = await req.json() as {
    staffName: string;
    coords: { lat: number; lng: number } | null;
    timestamp: string;
  };

  const mapsLink = coords
    ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
    : "GPS unavailable";

  const html = `
    <h2 style="color:#c0392b">🆘 SOS ALERT — Driver Emergency</h2>
    <p><strong>Driver:</strong> ${staffName}</p>
    <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</p>
    <p><strong>GPS:</strong> ${coords ? `${coords.lat}, ${coords.lng}` : "Not available"}</p>
    ${coords ? `<p><a href="${mapsLink}" style="color:#c0392b;font-weight:bold">Open in Google Maps →</a></p>` : ""}
    <hr/>
    <p style="color:#666;font-size:12px">This alert was sent from the Layover Legends Driver app.</p>
  `;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? "");
    await resend.emails.send({
      from:    "Layover Legends Alert <no-reply@layover-legends.com>",
      to:      "travellayoverlegends@gmail.com",
      subject: `🆘 SOS — ${staffName} — ${new Date(timestamp).toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam" })}`,
      html,
    });
  } catch (err) {
    console.error("[SOS] email failed:", err);
    return new Response(JSON.stringify({ error: "Failed to send" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
