"use client";

import { useEffect, useRef, useState } from "react";
import { submitContact } from "@/app/contact/actions";

type Subject = { value: string; label: string };

type Props = {
  subjects: Subject[];
  labels: Record<string, string>;
  turnstileSiteKey: string | null;
};

function lbl(labels: Record<string, string>, key: string, fb: string) {
  return labels[key] ?? fb;
}

export default function ContactForm({ subjects, labels, turnstileSiteKey }: Props) {
  const [pending, setPending]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error,   setError]       = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Load Turnstile script
  useEffect(() => {
    if (!turnstileSiteKey) return;
    if (document.querySelector('script[src*="turnstile"]')) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitContact(fd);
      if (result.ok) {
        setSuccess(true);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/8 px-6 py-8 text-center space-y-3">
        <p className="text-2xl">✓</p>
        <p className="font-semibold text-warm-cream/90">
          {lbl(labels, "contact.success_h", "Message sent!")}
        </p>
        <p className="text-sm text-warm-cream/60">
          {lbl(labels, "contact.success_body", "We've received your message and will reply within 24 hours.")}
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Honeypot — hidden from real users */}
      <input name="hp_url" type="text" tabIndex={-1}
        className="absolute opacity-0 pointer-events-none h-0 w-0 overflow-hidden"
        aria-hidden="true" autoComplete="off" />

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="cnt-name" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
            {lbl(labels, "contact.field_name", "Name")}<span className="text-red-400 ml-0.5">*</span>
          </label>
          <input id="cnt-name" name="name" type="text" required autoComplete="name"
            className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/40 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cnt-email" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
            {lbl(labels, "contact.field_email", "Email")}<span className="text-red-400 ml-0.5">*</span>
          </label>
          <input id="cnt-email" name="email" type="email" required autoComplete="email"
            className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/40 text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cnt-phone" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
          {lbl(labels, "contact.field_phone", "Phone (optional)")}
        </label>
        <input id="cnt-phone" name="phone" type="tel" autoComplete="tel"
          className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/40 text-sm" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cnt-subject" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
          {lbl(labels, "contact.field_subject", "Subject")}<span className="text-red-400 ml-0.5">*</span>
        </label>
        <select id="cnt-subject" name="subject" required
          className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
          style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
          <option value="" disabled style={{ backgroundColor: "#0D0D0D" }}>
            {lbl(labels, "contact.field_subject_placeholder", "Select a topic…")}
          </option>
          {subjects.map((s) => (
            <option key={s.value} value={s.value} style={{ backgroundColor: "#0D0D0D" }}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cnt-message" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
          {lbl(labels, "contact.field_message", "Message")}<span className="text-red-400 ml-0.5">*</span>
        </label>
        <textarea id="cnt-message" name="message" rows={5} required
          placeholder={lbl(labels, "contact.field_message_placeholder", "Tell us how we can help…")}
          className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/40 text-sm resize-none" />
        <p className="text-xs text-warm-cream/30">Min. 10 characters.</p>
      </div>

      {turnstileSiteKey && (
        <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="dark" />
      )}

      <button type="submit" disabled={pending}
        className="w-full px-6 py-3.5 rounded-full bg-legend-gold text-ink-black font-semibold hover:bg-gold-light active:bg-gold-dark disabled:opacity-50 transition-colors">
        {pending
          ? lbl(labels, "contact.sending", "Sending…")
          : lbl(labels, "contact.submit", "Send message →")}
      </button>

      <p className="text-xs text-warm-cream/30 text-center">
        {lbl(labels, "contact.privacy_note", "Your message is processed per our")}{" "}
        <a href="/legal/privacy" className="underline hover:text-warm-cream/50 transition-colors">
          {lbl(labels, "footer.privacy", "Privacy policy")}
        </a>.
      </p>
    </form>
  );
}
