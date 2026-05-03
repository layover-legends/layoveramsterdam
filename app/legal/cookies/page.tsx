import Link from "next/link";
import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE, canonicalFor } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const UPDATED = "2026-05-03";

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);
  const title = `${t(s, "legal.cookies.h1", "Cookie Policy")} · ${SITE.name}`;
  return {
    title,
    robots: { index: false },
    alternates: { canonical: canonicalFor("/legal/cookies") },
  };
}

export default async function CookiesPage() {
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t(s, "legal.cookies.h1", "Cookie Policy")}
        </h1>
        <p className="text-xs text-warm-cream/50">
          {t(s, "legal.cookies.updated", "Last updated: {date}").replace("{date}", UPDATED)}
        </p>
      </header>

      {/* Plain-language summary */}
      <section className="rounded-xl border border-legend-gold/20 bg-legend-gold/5 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {t(s, "legal.cookies.summary_h2", "In plain language")}
        </h2>
        <p className="text-sm text-warm-cream/80 leading-relaxed">
          {t(s, "legal.cookies.summary_body",
            "We use a small number of cookies to keep your session active, remember your language preference, and (only if you consent) measure site performance. We do not sell your data or run advertising trackers by default. You can change your preferences at any time using the button in the footer."
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cookies.what_h2", "What are cookies?")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.what_body",
            "Cookies are small text files stored in your browser when you visit a website. They allow the site to remember your preferences and session state between page loads. This policy covers cookies set by Layover Legends and by third-party services we use."
          )}
        </p>
      </section>

      {/* Category 1 — Essential */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cookies.essential_h2", "1. Strictly necessary cookies")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.essential_intro",
            "These cookies are required for the site to function. They cannot be disabled. No personal data is transmitted to third parties through these cookies."
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-warm-cream/70 border-collapse">
            <thead>
              <tr className="border-b border-warm-cream/10 text-left">
                <th className="py-2 pr-4 font-medium text-warm-cream/90">
                  {t(s, "legal.cookies.table_name", "Name")}
                </th>
                <th className="py-2 pr-4 font-medium text-warm-cream/90">
                  {t(s, "legal.cookies.table_provider", "Provider")}
                </th>
                <th className="py-2 pr-4 font-medium text-warm-cream/90">
                  {t(s, "legal.cookies.table_purpose", "Purpose")}
                </th>
                <th className="py-2 font-medium text-warm-cream/90">
                  {t(s, "legal.cookies.table_expires", "Expires")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/5">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">sb-*</td>
                <td className="py-2 pr-4">Supabase</td>
                <td className="py-2 pr-4">
                  {t(s, "legal.cookies.sb_purpose", "Authentication session token. Keeps you signed in.")}
                </td>
                <td className="py-2">
                  {t(s, "legal.cookies.session_expire", "Session")}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">lang</td>
                <td className="py-2 pr-4">Layover Legends</td>
                <td className="py-2 pr-4">
                  {t(s, "legal.cookies.lang_purpose", "Stores your language preference.")}
                </td>
                <td className="py-2">1 {t(s, "legal.cookies.year", "year")}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">cookie_consent</td>
                <td className="py-2 pr-4">Layover Legends</td>
                <td className="py-2 pr-4">
                  {t(s, "legal.cookies.consent_purpose", "Stores your cookie consent choices so we don't ask again.")}
                </td>
                <td className="py-2">1 {t(s, "legal.cookies.year", "year")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Category 2 — Analytics */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cookies.analytics_h2", "2. Analytics cookies (optional)")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.analytics_intro",
            "These cookies help us understand how visitors use the site. They are only activated if you click 'Accept all' or enable the Analytics category in your preferences. No personal identifiers are stored."
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-warm-cream/70 border-collapse">
            <thead>
              <tr className="border-b border-warm-cream/10 text-left">
                <th className="py-2 pr-4 font-medium text-warm-cream/90">{t(s, "legal.cookies.table_name", "Name")}</th>
                <th className="py-2 pr-4 font-medium text-warm-cream/90">{t(s, "legal.cookies.table_provider", "Provider")}</th>
                <th className="py-2 pr-4 font-medium text-warm-cream/90">{t(s, "legal.cookies.table_purpose", "Purpose")}</th>
                <th className="py-2 font-medium text-warm-cream/90">{t(s, "legal.cookies.table_expires", "Expires")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/5">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">_vsi</td>
                <td className="py-2 pr-4">Vercel</td>
                <td className="py-2 pr-4">
                  {t(s, "legal.cookies.vsi_purpose", "Vercel Speed Insights — anonymous page performance measurement.")}
                </td>
                <td className="py-2">{t(s, "legal.cookies.session_expire", "Session")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Category 3 — Marketing */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cookies.marketing_h2", "3. Marketing cookies (optional)")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.marketing_intro",
            "Marketing cookies are currently not active on this site. If we introduce remarketing tools (e.g. Meta Pixel, Google Ads) in the future, we will update this policy and request fresh consent before activating them."
          )}
        </p>
      </section>

      {/* Third-party links */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cookies.thirdparty_h2", "Third-party services")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.thirdparty_body",
            "The following third-party services may set cookies or access data through our site. Each has its own privacy policy and cookie policy."
          )}
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-warm-cream/70 pl-1">
          <li>Supabase (database + auth) — supabase.com/privacy</li>
          <li>Stripe (payments) — stripe.com/privacy</li>
          <li>Vercel (hosting) — vercel.com/legal/privacy-policy</li>
          <li>Mapbox (maps) — mapbox.com/legal/privacy</li>
          <li>Resend (email) — resend.com/legal/privacy-policy</li>
          <li>Google (OAuth sign-in) — policies.google.com/privacy</li>
          <li>DeepL (translations — no user-facing cookies)</li>
          <li>Cloudflare (DNS + DDoS protection — no cookies set directly)</li>
        </ul>
      </section>

      {/* Managing preferences */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cookies.manage_h2", "Managing your preferences")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.manage_body",
            "You can change your cookie preferences at any time by clicking 'Manage cookies' in the footer of any page. You can also clear cookies through your browser settings, though this will sign you out."
          )}
        </p>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.dnt_body",
            "If your browser sends the Do Not Track (DNT) signal, we automatically decline all optional cookies."
          )}
        </p>
      </section>

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cookies.contact_h2", "Questions?")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cookies.contact_body",
            "Email travellayoverlegends@gmail.com or contact the Dutch data protection authority: Autoriteit Persoonsgegevens, autoriteitpersoonsgegevens.nl."
          )}
        </p>
      </section>

      <nav className="pt-4 text-xs text-warm-cream/40 flex gap-4">
        <Link href="/legal/privacy" className="hover:text-warm-cream/70 transition-colors">
          {t(s, "footer.privacy", "Privacy policy")}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/terms" className="hover:text-warm-cream/70 transition-colors">
          {t(s, "footer.terms", "Terms of service")}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/cancellation" className="hover:text-warm-cream/70 transition-colors">
          {t(s, "footer.cancellation", "Cancellation policy")}
        </Link>
      </nav>
    </main>
  );
}
