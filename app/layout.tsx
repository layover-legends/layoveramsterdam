import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveLocale();

  return (
    <html
      lang={locale}
      className={`${cormorant.variable} ${outfit.variable} ${jetbrains.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://idgobxvhbhdymfsfmhae.supabase.co" />
      </head>
      <body className="font-sans bg-ink-black text-warm-cream">
        {children}
      </body>
    </html>
  );
}
