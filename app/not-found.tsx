import Link from "next/link";
import { getUiStrings } from "@/lib/i18n/ui";
import { t } from "@/lib/i18n/t";

export const metadata = {
  title: "404 — Page not found · Layover Legends",
};

export default async function NotFound() {
  const s = await getUiStrings();

  return (
    <div className="min-h-screen bg-ink-black flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-legend-gold/60 text-sm tracking-[0.2em] uppercase mb-6">
        404
      </p>

      <h1 className="font-display text-4xl sm:text-6xl font-semibold text-warm-cream mb-4 leading-tight">
        {t(s, "public.errors.404.headline", "Lost in Schiphol?")}
      </h1>

      <p className="text-warm-cream/50 text-lg max-w-sm mb-10">
        {t(s, "public.errors.404.body", "This page doesn't exist or has moved.")}
      </p>

      <Link
        href="/"
        className="inline-block bg-legend-gold text-ink-black font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-gold-light transition-colors"
      >
        {t(s, "public.errors.404.cta", "← Back to homepage")}
      </Link>
    </div>
  );
}
