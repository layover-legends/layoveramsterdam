import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";
import { getUiStrings, t } from "@/lib/i18n/ui";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Don't waste your layover.`,
    template: `%s · ${SITE.name}`,
  },
  description: "Premium layover tours at Amsterdam Schiphol. Don't waste your layover.",
  icons: {
    icon: [
      { url: "/logo/favicon-set/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, s] = await Promise.all([
    Promise.resolve(resolveLocale()),
    getUiStrings(),
  ]);

  return (
    <html
      lang={locale}
      className={`${cormorant.variable} ${outfit.variable} ${jetbrains.variable}`}
    >
      <body className="font-sans bg-ink-black text-warm-cream">
        {/* Public language switcher — top-right on all pages */}
        <div className="fixed top-3 right-4 z-50">
          <LanguageSwitcher
            currentLocale={locale}
            ariaLabel={t(s, "auth.select_language", "Select language")}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
