"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const CONTACT_EMAIL = "travellayoverlegends@gmail.com";
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX = 3;

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

export type ContactFormResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitContact(formData: FormData): Promise<ContactFormResult> {
  const name     = (formData.get("name")    as string | null)?.trim() ?? "";
  const email    = (formData.get("email")   as string | null)?.trim() ?? "";
  const phone    = (formData.get("phone")   as string | null)?.trim() || null;
  const subject  = (formData.get("subject") as string | null)?.trim() ?? "";
  const message  = (formData.get("message") as string | null)?.trim() ?? "";
  const honeypot = (formData.get("hp_url")  as string | null)?.trim() ?? "";
  const cfToken  = (formData.get("cf-turnstile-response") as string | null)?.trim() ?? "";

  // ── Layer 1: Honeypot ──────────────────────────────────────────────────────
  if (honeypot) return { ok: true }; // Silent pass — bot filled the honey field

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!name || !email || !subject || !message) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (message.length < 10 || message.length > 5000) {
    return { ok: false, error: "Message must be between 10 and 5000 characters." };
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0]?.trim()) ?? null;
  const ua = h.get("user-agent") ?? null;

  // ── Layer 2: Turnstile (if configured) ────────────────────────────────────
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY ?? "";
  if (turnstileSecret && cfToken) {
    try {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: turnstileSecret, response: cfToken, remoteip: ip }),
      });
      const verifyJson = await verifyRes.json() as { success: boolean };
      if (!verifyJson.success) {
        return { ok: false, error: "Bot check failed. Please try again." };
      }
    } catch { /* non-fatal — skip Turnstile check on API error */ }
  } else if (turnstileSecret && !cfToken) {
    return { ok: false, error: "Security check required. Please complete the challenge." };
  }

  const admin = createAdminClient();

  // ── Layer 3: IP rate limiting (3/hour) ────────────────────────────────────
  if (ip) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("contact_rate_limits")
      .select("count, window_start")
      .eq("ip_address", ip)
      .maybeSingle() as { data: { count: number; window_start: string } | null };

    if (existing) {
      const windowAge = Date.now() - new Date(existing.window_start).getTime();
      if (windowAge < RATE_LIMIT_WINDOW_MINUTES * 60 * 1000) {
        if (existing.count >= RATE_LIMIT_MAX) {
          return { ok: false, error: "Too many messages. Please wait 1 hour and try again." };
        }
        await admin.from("contact_rate_limits")
          .update({ count: existing.count + 1 })
          .eq("ip_address", ip);
      } else {
        // Reset window
        await admin.from("contact_rate_limits")
          .update({ count: 1, window_start: new Date().toISOString() })
          .eq("ip_address", ip);
      }
    } else {
      await admin.from("contact_rate_limits")
        .insert({ ip_address: ip, count: 1, window_start: new Date().toISOString() });
    }
  }

  // ── Save to DB ─────────────────────────────────────────────────────────────
  const { error: dbErr } = await admin.from("contact_submissions").insert({
    name, email, phone, subject, message,
    ip_address: ip,
    user_agent: ua,
    status: "new",
  });

  if (dbErr) {
    console.error("[contact] DB insert failed:", dbErr.message);
    return { ok: false, error: "Failed to send your message. Please try again." };
  }

  // Audit log
  await admin.from("audit_logs").insert({
    event_type: "contact_submission",
    payload: { email, subject },
    ip_address: ip,
    user_agent: ua,
  });

  // ── Emails ─────────────────────────────────────────────────────────────────
  const resend = getResend();
  const subjectLabel = subject.replace(/_/g, " ");

  // Notify admin
  await resend.emails.send({
    from:    "Layover Legends <no-reply@layover-legends.com>",
    to:      CONTACT_EMAIL,
    subject: `New contact: ${subjectLabel} — ${name}`,
    html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
           ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
           <p><strong>Subject:</strong> ${subjectLabel}</p>
           <p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>`,
  }).catch(() => { /* non-fatal */ });

  // Confirmation to user
  await resend.emails.send({
    from:    "Layover Legends <no-reply@layover-legends.com>",
    to:      email,
    subject: "We received your message — Layover Legends",
    html: `<p>Hi ${name},</p>
           <p>Thanks for reaching out! We've received your message and will reply within 24 hours (usually much sooner).</p>
           <p><strong>Your subject:</strong> ${subjectLabel}</p>
           <hr>
           <p style="color:#888;font-size:12px">Layover Legends · Amsterdam · travellayoverlegends@gmail.com</p>`,
  }).catch(() => { /* non-fatal */ });

  return { ok: true };
}
