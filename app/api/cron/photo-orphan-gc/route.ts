import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const SECRET   = process.env.CRON_SECRET ?? "";
const ADMIN_EMAIL = "travellayoverlegends@gmail.com";
const ORPHAN_DAYS = 90;

export async function GET(req: NextRequest) {
  if (!SECRET || req.headers.get("authorization") !== `Bearer ${SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createAdminClient();

  // Query orphan candidates (>90 days old, usage_count=0)
  const cutoff = new Date(Date.now() - ORPHAN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: orphans } = await admin
    .from("photos")
    .select("id, alt_text, original_filename, source, bytes, created_at")
    .eq("usage_count", 0)
    .lt("created_at", cutoff);

  const candidates = (orphans ?? []) as {
    id: string; alt_text: string; original_filename: string | null;
    source: string; bytes: number | null; created_at: string;
  }[];

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ ok: true, candidates: 0 }), { status: 200 });
  }

  // Log to audit_logs (NEVER auto-delete — operator decides)
  for (const c of candidates) {
    await admin.from("audit_logs").insert({
      event_type: "photo_orphan_gc_candidate",
      payload: { photo_id: c.id, alt_text: c.alt_text, source: c.source, bytes: c.bytes },
    });
  }

  // Send weekly digest email to admin
  const totalBytes = candidates.reduce((s, c) => s + (c.bytes ?? 0), 0);
  const resend = new Resend(process.env.RESEND_API_KEY ?? "");

  const rows = candidates.slice(0, 20).map((c) =>
    `<tr>
      <td style="padding:4px 8px;color:#F7F3EC;font-size:12px">${c.original_filename ?? c.id.slice(0,8)}</td>
      <td style="padding:4px 8px;color:#888;font-size:12px">${c.source}</td>
      <td style="padding:4px 8px;color:#888;font-size:12px">${c.bytes ? Math.round(c.bytes/1024)+'KB' : '—'}</td>
      <td style="padding:4px 8px;color:#888;font-size:12px">${new Date(c.created_at).toLocaleDateString('nl-NL')}</td>
    </tr>`
  ).join("");

  await resend.emails.send({
    from:    "Layover Legends <no-reply@layover-legends.com>",
    to:      ADMIN_EMAIL,
    subject: `🖼 ${candidates.length} orphan photo${candidates.length !== 1 ? "s" : ""} — weekly GC digest`,
    html: `<h2 style="color:#C9963A">Orphan Photo Candidates</h2>
           <p style="color:#F7F3EC">${candidates.length} photos older than ${ORPHAN_DAYS} days with 0 uses (${Math.round(totalBytes/1024/1024)}MB total).</p>
           <p style="color:#888">Review at: <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/assets?usage=orphaned" style="color:#C9963A">/admin/assets → Orphaned</a></p>
           <p style="color:#888"><strong>No photos were automatically deleted.</strong> You decide which to keep or remove.</p>
           <table style="border-collapse:collapse;margin-top:16px">
             <tr style="color:#888;font-size:11px;text-transform:uppercase">
               <th style="padding:4px 8px;text-align:left">File</th>
               <th style="padding:4px 8px;text-align:left">Source</th>
               <th style="padding:4px 8px;text-align:left">Size</th>
               <th style="padding:4px 8px;text-align:left">Uploaded</th>
             </tr>
             ${rows}
             ${candidates.length > 20 ? `<tr><td colspan="4" style="padding:4px 8px;color:#666;font-size:12px">… and ${candidates.length - 20} more</td></tr>` : ""}
           </table>`,
  }).catch(() => { /* non-fatal */ });

  return new Response(JSON.stringify({ ok: true, candidates: candidates.length }), { status: 200 });
}
