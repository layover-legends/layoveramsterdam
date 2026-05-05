import type { Metadata } from "next";
import Link from "next/link";
import { getAllActiveFaqs } from "@/lib/admin/faq";
import { FAQ_CATEGORIES } from "@/lib/admin/faq-types";
import { StructuredData } from "@/components/seo/StructuredData";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE, canonicalFor } from "@/lib/seo/site";
import FaqAccordion from "@/components/public/FaqAccordion";

export const revalidate = 3600; // ISR — FAQ content rarely changes

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);
  return {
    title: `${t(s, "faq.page_title", "Frequently Asked Questions")} · ${SITE.name}`,
    description: t(s, "faq.meta_desc", "Everything you need to know about Layover Legends Amsterdam tours. Booking, payment, cancellation, and more."),
    alternates: { canonical: canonicalFor("/faq") },
  };
}

export default async function FaqPage() {
  const locale = resolveLocale();
  const [entries, s] = await Promise.all([getAllActiveFaqs(), loadUiStrings(locale)]);

  // Build schema.org FAQPage JSON-LD
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": entries.map((e) => ({
      "@type": "Question",
      "name": e.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": e.answer,
      },
    })),
  };

  return (
    <>
      <StructuredData data={[faqLd]} />
      <main className="min-h-screen bg-ink-black text-warm-cream px-6 py-12 max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
          ← {t(s, "common.back_to_home", "Back to home")}
        </Link>

        <header className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t(s, "faq.page_title", "Frequently Asked Questions")}
          </h1>
          <p className="text-warm-cream/70 leading-relaxed">
            {t(s, "faq.subtitle", "Everything you need to know before your Amsterdam layover tour.")}
          </p>
        </header>

        {/* Category quick-links */}
        <div className="flex flex-wrap gap-2">
          {FAQ_CATEGORIES.filter((c) =>
            entries.some((e) => e.category === c.value)
          ).map((cat) => (
            <a key={cat.value} href={`#cat-${cat.value}`}
              className="px-3 py-1.5 rounded-full border border-warm-cream/20 text-warm-cream/60 text-xs hover:bg-warm-cream/5 hover:text-warm-cream/90 transition-colors">
              {cat.label}
            </a>
          ))}
        </div>

        {/* Group by category */}
        {FAQ_CATEGORIES.map((cat) => {
          const catEntries = entries.filter((e) => e.category === cat.value);
          if (!catEntries.length) return null;
          return (
            <section key={cat.value} id={`cat-${cat.value}`} className="space-y-4 scroll-mt-8">
              <h2 className="text-lg font-semibold text-legend-gold">{cat.label}</h2>
              <FaqAccordion entries={catEntries} />
            </section>
          );
        })}

        {/* Contact CTA */}
        <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 p-6 text-center space-y-3">
          <p className="text-warm-cream/80">
            {t(s, "faq.cta_body", "Can't find the answer you're looking for?")}
          </p>
          <Link href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-legend-gold text-ink-black font-semibold hover:bg-gold-light transition-colors">
            {t(s, "faq.cta_button", "Contact us →")}
          </Link>
        </div>

        <nav className="pt-4 text-xs text-warm-cream/40 flex flex-wrap gap-4">
          <Link href="/legal/privacy" className="hover:text-warm-cream/70 transition-colors">Privacy</Link>
          <span>·</span>
          <Link href="/legal/terms"   className="hover:text-warm-cream/70 transition-colors">Terms</Link>
          <span>·</span>
          <Link href="/contact"       className="hover:text-warm-cream/70 transition-colors">Contact</Link>
        </nav>
      </main>
    </>
  );
}
