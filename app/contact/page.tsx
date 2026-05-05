import type { Metadata } from "next";
import Link from "next/link";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE, canonicalFor } from "@/lib/seo/site";
import ContactForm from "@/components/public/ContactForm";

export const revalidate = 3600;

const CONTACT_SUBJECTS = [
  { value: "general_inquiry",  label: "General inquiry" },
  { value: "existing_booking", label: "Existing booking" },
  { value: "group_booking",    label: "Group booking (6+ people)" },
  { value: "press",            label: "Press & media" },
  { value: "partnership",      label: "Partnership / B2B" },
  { value: "complaint",        label: "Complaint" },
  { value: "compliment",       label: "Compliment" },
  { value: "other",            label: "Other" },
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);
  return {
    title: `${t(s, "contact.page_title", "Contact us")} · ${SITE.name}`,
    description: t(s, "contact.meta_desc", "Get in touch with Layover Legends Amsterdam. Questions about tours, bookings, or group experiences."),
    alternates: { canonical: canonicalFor("/contact") },
  };
}

export default async function ContactPage() {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-6 py-12 max-w-2xl mx-auto space-y-8">
      <Link href="/" className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
        ← {t(s, "common.back_to_home", "Back to home")}
      </Link>

      <header className="space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t(s, "contact.page_title", "Get in touch")}
        </h1>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "contact.subtitle", "We typically reply within 4 hours during business hours (Mon–Sat 08:00–20:00 CET).")}
        </p>
      </header>

      {/* Quick contact info */}
      <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/5 px-5 py-4 space-y-2 text-sm">
        <p className="text-warm-cream/90 font-medium">{t(s, "contact.direct_h", "Direct contact")}</p>
        <p className="text-warm-cream/60">
          Email: <a href="mailto:travellayoverlegends@gmail.com"
            className="text-legend-gold hover:text-gold-light transition-colors">
            travellayoverlegends@gmail.com
          </a>
        </p>
        <p className="text-warm-cream/60">
          {t(s, "contact.faq_hint", "Quick question? Check our")}{" "}
          <Link href="/faq" className="text-legend-gold hover:text-gold-light transition-colors">FAQ →</Link>
        </p>
      </div>

      <ContactForm subjects={CONTACT_SUBJECTS} labels={s} turnstileSiteKey={turnstileSiteKey} />

      <nav className="pt-4 text-xs text-warm-cream/40 flex flex-wrap gap-4">
        <Link href="/faq"          className="hover:text-warm-cream/70 transition-colors">FAQ</Link>
        <span>·</span>
        <Link href="/legal/privacy" className="hover:text-warm-cream/70 transition-colors">Privacy</Link>
        <span>·</span>
        <Link href="/legal/terms"   className="hover:text-warm-cream/70 transition-colors">Terms</Link>
      </nav>
    </main>
  );
}
