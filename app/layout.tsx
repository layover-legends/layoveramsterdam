import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/seo/site";
import { resolveLocale } from "@/lib/i18n/resolve";
import { getUiStrings } from "@/lib/i18n/ui";
import ConsentBanner from "@/components/cookies/ConsentBanner";
import SiteFooter from "@/components/public/SiteFooter";

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
    // Sub-pages already include the brand in their title string.
    // Keeping template as pass-through prevents double-append.
    template: `%s`,
  },
  description: "Premium layover tours at Amsterdam Schiphol. Don't waste your layover.",
  icons: {
    icon: [
      // SVG first — vector, infinitely sharp where supported
      { url: "/logo/favicon-set/favicon.svg", type: "image/svg+xml" },
      // PNG fallbacks — sized for browser tab + bookmarks
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    // Multi-resolution .ico for legacy + Edge address-bar
    shortcut: "/favicon.ico",
    // iOS home-screen icon when added to Home Screen
    apple: "/apple-touch-icon.png",
  },
};

// themeColor lives in viewport (Next 14+ — moved out of metadata)
// Tints the mobile browser chrome (Android Chrome address bar, iOS Safari status bar)
// to match brand black instead of default white.
export const viewport: Viewport = {
  themeColor: "#0D0D0D",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveLocale();
  const s = await getUiStrings();

  const cookieLabels: Record<string, string> = Object.fromEntries(
    Object.entries(s).filter(([k]) => k.startsWith("cookies.") || k === "common.close" || k === "common.cancel")
  );

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
        <SiteFooter />
        <ConsentBanner labels={cookieLabels} />
      </body>
    </html>
  );
}
