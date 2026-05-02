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
  const title = `${t(s, "legal.privacy.h1", "Privacy Policy")} · ${SITE.name}`;
  return {
    title,
    robots: { index: false },
    alternates: { canonical: canonicalFor("/legal/privacy") },
  };
}

export default async function PrivacyPage() {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);

  return (
    <main className="min-h-screen bg-brand-navy text-brand-cream px-6 py-12 max-w-2xl mx-auto space-y-8">
      <Link
        href="/"
        className="text-xs text-brand-cream/50 hover:text-brand-cream/80 transition-colors"
      >
        {t(s, "legal.back", "← Back to home")}
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t(s, "legal.privacy.h1", "Privacy Policy")}
        </h1>
        <p className="text-xs text-brand-cream/50">
          {t(s, "legal.privacy.updated", "Last updated: {date}").replace("{date}", UPDATED)}
        </p>
      </header>

      <p className="text-brand-cream/80 leading-relaxed">
        {t(s, "legal.privacy.intro", "LayoverAmsterdam (\"we\", \"us\") respects your privacy. This policy explains what data we collect, why, and what rights you have under GDPR.")}
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.privacy.collect_h2", "What we collect")}
        </h2>
        <p className="text-brand-cream/70 leading-relaxed">
          {t(s, "legal.privacy.collect_body", "When you sign in with Google we receive your name, email address, and profile picture from your Google account. We also store your preferred language, nationality (if you choose to provide it), and whether you opted in to marketing emails. We log your consent timestamp as required by GDPR Art. 7.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.privacy.use_h2", "How we use it")}
        </h2>
        <p className="text-brand-cream/70 leading-relaxed">
          {t(s, "legal.privacy.use_body", "We use your data to manage your account, send booking confirmations, and (if you opted in) occasional launch updates. We do not sell your data. We do not share it with third parties except Supabase (database, EU-hosted) and Resend (transactional email).")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.privacy.rights_h2", "Your rights (GDPR)")}
        </h2>
        <p className="text-brand-cream/70 leading-relaxed">
          {t(s, "legal.privacy.rights_body", "You have the right to access, correct, or delete your data at any time. To exercise these rights, email hello@layover-legends.com. We will respond within 30 days. You may also withdraw marketing consent at any time from your account settings.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.privacy.retention_h2", "Data retention")}
        </h2>
        <p className="text-brand-cream/70 leading-relaxed">
          {t(s, "legal.privacy.retention_body", "We retain your account data for as long as your account is active. If you request deletion, we will erase your data within 30 days except where we are required by law to retain financial records.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.privacy.controller_h2", "Data controller")}
        </h2>
        <p className="text-brand-cream/70 leading-relaxed">
          {t(s, "legal.privacy.controller_body", "LayoverAmsterdam, Amsterdam, Netherlands. Contact: hello@layover-legends.com")}
        </p>
      </section>

      <nav className="pt-4 text-xs text-brand-cream/40 flex gap-4">
        <Link href="/legal/terms" className="hover:text-brand-cream/70 transition-colors">
          {t(s, "footer.terms", "Terms of service")}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/cancellation" className="hover:text-brand-cream/70 transition-colors">
          {t(s, "footer.cancellation", "Cancellation policy")}
        </Link>
      </nav>
    </main>
  );
}
