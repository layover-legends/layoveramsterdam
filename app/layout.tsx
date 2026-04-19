import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Layover Amsterdam — Coming Soon",
  description:
    "Premium layover tours at Amsterdam Schiphol. Turn your layover into a legend.",
  openGraph: {
    title: "Layover Amsterdam — Coming Soon",
    description:
      "Premium layover tours at Amsterdam Schiphol. Turn your layover into a legend.",
    images: [
      "https://idgobxvhbhdymfsfmhae.supabase.co/storage/v1/object/public/assets/homepage/comingsoon.PNG",
    ],
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
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
