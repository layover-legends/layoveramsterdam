import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Curated Amsterdam Layover Tours`,
    template: `%s · ${SITE.name}`,
  },
  description: "Premium layover tours at Amsterdam Schiphol. Turn your layover into a legend.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveLocale();

  return (
    <html lang={locale}>
      <body>
        {/* Public language switcher — top-right on all pages */}
        <div className="fixed top-3 right-4 z-50">
          <LanguageSwitcher currentLocale={locale} />
        </div>
        {children}
      </body>
    </html>
  );
}
