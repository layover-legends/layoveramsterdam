import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/lib/seo/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Curated Amsterdam Layover Tours`,
    template: `%s · ${SITE.name}`,
  },
  description: "Premium layover tours at Amsterdam Schiphol. Turn your layover into a legend.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
