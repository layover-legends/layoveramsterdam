import Link from "next/link";
import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE, canonicalFor } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);
  const title = `${t(s, "legal.cancellation.h1", "Cancellation Policy")} · ${SITE.name}`;
  return {
    title,
    robots: { index: false },
    alternates: { canonical: canonicalFor("/legal/cancellation") },
  };
}

export default async function CancellationPage() {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);

  const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
    {
      label: t(s, "legal.cancellation.row1_label", "More than 48 hours before pickup"),
      value: t(s, "legal.cancellation.row1_value", "100% refund"),
      highlight: true,
    },
    {
      label: t(s, "legal.cancellation.row2_label", "24–48 hours before pickup"),
      value: t(s, "legal.cancellation.row2_value", "50% refund"),
    },
    {
      label: t(s, "legal.cancellation.row3_label", "Less than 24 hours or no-show"),
      value: t(s, "legal.cancellation.row3_value", "No refund"),
    },
    {
      label: t(s, "legal.cancellation.row4_label", "Cancelled by us (weather, vehicle, force majeure)"),
      value: t(s, "legal.cancellation.row4_value", "100% refund + a voucher for a future tour"),
      highlight: true,
    },
  ];

  return (
    <main className="min-h-screen bg-ink-black text-warm-cream px-6 py-12 max-w-2xl mx-auto space-y-8">
      <Link
        href="/"
        className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors"
      >
        {t(s, "legal.back", "← Back to home")}
      </Link>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t(s, "legal.cancellation.h1", "Cancellation Policy")}
        </h1>
      </header>

      <p className="text-warm-cream/80 leading-relaxed">
        {t(s, "legal.cancellation.intro", "We know layovers are unpredictable. Here is our refund policy based on how much notice you give us.")}
      </p>

      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-warm-cream/10 last:border-0"
            >
              <td className="py-3 pr-4 text-warm-cream/70 leading-snug">{row.label}</td>
              <td className={`py-3 font-semibold whitespace-nowrap text-right ${row.highlight ? "text-emerald-300" : "text-warm-cream"}`}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cancellation.flights_h2", "Flight delays and missed connections")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cancellation.flights_body", "If your inbound flight is delayed and you cannot start the tour as scheduled, contact us immediately. We will reschedule at no extra charge whenever possible, or issue a full refund if no suitable alternative exists. We are not liable for missed departure flights.")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t(s, "legal.cancellation.contact_h2", "How to cancel")}
        </h2>
        <p className="text-warm-cream/70 leading-relaxed">
          {t(s, "legal.cancellation.contact_body", "Email us at hello@layover-legends.com with your booking reference and we will process the cancellation within one business day.")}
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
      </nav>
    </main>
  );
}
