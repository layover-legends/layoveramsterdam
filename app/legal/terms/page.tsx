import Link from "next/link";
import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE, canonicalFor } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const UPDATED = "2026-05-02";

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);
  const title = `${t(s, "legal.terms.h1", "Terms of Service")} · ${SITE.name}`;
  return {
    title,
    robots: { index: false },
    alternates: { canonical: canonicalFor("/legal/terms") },
  };
}

export default async function TermsPage() {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-6 py-12 max-w-2xl mx-auto space-y-8">
      <Link
        href="/"
        className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors"
      >
        {t(s, "legal.back", "← Back to home")}
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t(s, "legal.terms.h1", "Terms of Service")}
        </h1>
        <p className="text-xs text-warm-cream/50">
          {t(s, "legal.terms.updated", "Last updated: {date}").replace("{date}", UPDATED)}
        </p>
      </header>

      <p className="text-warm-cream/80 leading-relaxed">
        {t(s, "legal.terms.intro", "By using LayoverAmsterdam you agree to these terms. Please read them before booking.")}
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.terms.service_h2", "The service")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.terms.service_body", "We organise curated layover tours in Amsterdam. Tours depart from and return to Amsterdam Schiphol Airport. It is your responsibility to allow sufficient time to clear security and board your onward flight.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.terms.booking_h2", "Bookings")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.terms.booking_body", "A booking is confirmed only after full payment is received. Prices are in euros and include applicable taxes. We reserve the right to substitute stops or adjust timing due to closures, weather, or safety concerns.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.terms.liability_h2", "Liability")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.terms.liability_body", "LayoverAmsterdam is not liable for missed flights, flight delays, or any indirect loss arising from participation in a tour. Our maximum liability is limited to the amount you paid for the booking.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.terms.law_h2", "Governing law")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.terms.law_body", "These terms are governed by the laws of the Netherlands. Any disputes are subject to the exclusive jurisdiction of the courts of Amsterdam.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.terms.contact_h2", "Contact")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.terms.contact_body", "Questions? Email hello@layover-legends.com")}
        </p>
      </section>

      <nav className="pt-4 text-xs text-warm-cream/40 flex gap-4">
        <Link href="/legal/privacy" className="hover:text-warm-cream/70 transition-colors">
          {t(s, "footer.privacy", "Privacy policy")}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/cancellation" className="hover:text-warm-cream/70 transition-colors">
          {t(s, "footer.cancellation", "Cancellation policy")}
        </Link>
      </nav>
    </main>
  );
}
