import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAllRatesList, countryToCurrency } from "@/lib/currency/fx";
import { parseCurrencyCookie, CURRENCY_COOKIE } from "@/lib/currency/format";
import { getUiStrings, t } from "@/lib/i18n/ui";
import CurrencyPicker from "@/components/public/CurrencyPicker";
import CookieSettingsButton from "@/components/public/CookieSettingsButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { resolveLocale } from "@/lib/i18n/resolve";
import type { Locale } from "@/lib/i18n/locales";

const SOCIAL_ICONS: Record<string, { icon: string; label: string }> = {
  social_instagram_url: { icon: "📸", label: "Instagram" },
  social_tiktok_url:    { icon: "🎵", label: "TikTok" },
  social_linkedin_url:  { icon: "💼", label: "LinkedIn" },
  social_facebook_url:  { icon: "📘", label: "Facebook" },
  social_youtube_url:   { icon: "▶", label: "YouTube" },
};

export default async function SiteFooter() {
  const supabase = createClient();
  const locale   = resolveLocale() as Locale;

  // Load everything in parallel
  const [s, settingsData, categoryData, fxRates] = await Promise.all([
    getUiStrings(),
    supabase.from("site_settings").select("key, value"),
    supabase
      .from("destination_categories")
      .select("name, slug")
      .eq("is_active", true)
      .order("name")
      .limit(8),
    getAllRatesList(),
  ]);

  const settings: Record<string, string | null> = {};
  for (const row of (settingsData.data ?? []) as { key: string; value: string | null }[]) {
    settings[row.key] = row.value;
  }

  const categories = (categoryData.data ?? []) as { name: string; slug: string }[];

  // Resolve current display currency
  const cookieCurrency = parseCurrencyCookie(cookies().get(CURRENCY_COOKIE)?.value);
  const geoCountry     = headers().get("x-vercel-ip-country") ?? null;
  const geoCurrency    = countryToCurrency(geoCountry);
  const currentCurrency = cookieCurrency !== "EUR" ? cookieCurrency : geoCurrency;

  const founderName  = settings["founder_name"] ?? "Steven Dupont";
  const kvk          = settings["kvk_number"];
  const vat          = settings["vat_number"];
  const year         = String(new Date().getFullYear());

  // Social links — skip if null
  const socialLinks = Object.entries(SOCIAL_ICONS)
    .filter(([key]) => settings[key])
    .map(([key, meta]) => ({ href: settings[key]!, ...meta }));

  return (
    <footer className="border-t border-warm-cream/10 bg-ink-black text-warm-cream">
      {/* 4-column grid */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">

        {/* Col 1 — Tours */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-legend-gold">
            {t(s, "footer.col_tours", "Tours")}
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/tours"
                className="text-sm text-warm-cream/60 hover:text-warm-cream/90 transition-colors">
                {t(s, "footer.all_tours", "All tours")}
              </Link>
            </li>
            {categories.slice(0, 6).map((cat) => (
              <li key={cat.slug}>
                <Link href={`/tours?category=${cat.slug}`}
                  className="text-sm text-warm-cream/60 hover:text-warm-cream/90 transition-colors capitalize">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 2 — Company */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-legend-gold">
            {t(s, "footer.col_company", "Company")}
          </h3>
          <ul className="space-y-2">
            {[
              { href: "/about",   label: t(s, "footer.about",   "About us") },
              { href: "/contact", label: t(s, "footer.contact",  "Contact") },
              { href: "/faq",     label: t(s, "footer.faq",      "FAQ") },
              { href: "/tours",   label: t(s, "footer.reviews_link", "Reviews") },
              { href: "/stops",   label: t(s, "footer.stops",    "Destinations") },
              { href: "/blog",    label: t(s, "footer.blog",     "Blog") },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href}
                  className="text-sm text-warm-cream/60 hover:text-warm-cream/90 transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Legal */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-legend-gold">
            {t(s, "footer.col_legal", "Legal")}
          </h3>
          <ul className="space-y-2">
            {[
              { href: "/legal/privacy",      label: t(s, "footer.privacy",      "Privacy policy") },
              { href: "/legal/terms",        label: t(s, "footer.terms",        "Terms of service") },
              { href: "/legal/cookies",      label: t(s, "footer.cookies",      "Cookie policy") },
              { href: "/legal/cancellation", label: t(s, "footer.cancellation", "Cancellation policy") },
              { href: "/legal/security",     label: t(s, "footer.security",     "Security policy") },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href}
                  className="text-sm text-warm-cream/60 hover:text-warm-cream/90 transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — Connect */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-legend-gold">
            {t(s, "footer.col_connect", "Connect")}
          </h3>
          {socialLinks.length > 0 ? (
            <ul className="space-y-2">
              {socialLinks.map(({ href, icon, label }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-warm-cream/60 hover:text-warm-cream/90 transition-colors">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-warm-cream/30">
              {t(s, "footer.social_coming", "Social links coming soon.")}
            </p>
          )}
          {/* Newsletter placeholder */}
          <div className="pt-2">
            <p className="text-xs text-warm-cream/30">
              {t(s, "footer.newsletter_coming", "Newsletter · Coming soon")}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="border-t border-warm-cream/8 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs text-warm-cream/35">

          {/* Copyright + legal numbers */}
          <div className="flex flex-wrap gap-2 sm:mr-auto justify-center sm:justify-start">
            <span>
              {t(s, "footer.copyright", "© {year} Layover Legends. All rights reserved.")
                .replace("{year}", year)
                .replace("Layover Legends", founderName !== "Steven Dupont" ? `Layover Legends (${founderName})` : "Layover Legends")}
            </span>
            {kvk && <span>KvK {kvk}</span>}
            {vat && <span>VAT {vat}</span>}
          </div>

          {/* Pickers + manage cookies */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <LanguageSwitcher currentLocale={locale} ariaLabel="Language" />
            <CurrencyPicker
              rates={fxRates}
              currentCurrency={currentCurrency}
              compact
            />
            <CookieSettingsButton
              label={t(s, "footer.manage_cookies", "Manage cookies")}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
