import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listStaff } from "@/lib/admin/staff";
import { resolveLocale } from "@/lib/i18n/resolve";
import { loadUiStrings, t } from "@/lib/i18n/ui";
import { SITE, canonicalFor } from "@/lib/seo/site";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const s = await loadUiStrings(locale);
  return {
    title: `${t(s, "about.page_title", "About Layover Legends")} · ${SITE.name}`,
    description: t(s, "about.meta_desc", "The story behind Amsterdam's friendliest layover tour company. Founded by Steven Dupont to turn wasted layovers into unforgettable experiences."),
    alternates: { canonical: canonicalFor("/about") },
  };
}

export default async function AboutPage() {
  const locale = resolveLocale();
  const supabase = createClient();

  const [s, staffResult, { data: bookingCount }, { data: cityCount }] = await Promise.all([
    loadUiStrings(locale),
    listStaff({ showInactive: false }),
    supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["paid","confirmed","in_progress","completed"]),
    supabase.from("cities").select("id", { count: "exact", head: true }),
  ]);

  const tours_operated = (bookingCount as unknown as number) ?? 0;
  const cities_count   = (cityCount   as unknown as number) ?? 1;

  // Collect all unique languages spoken across active staff
  const allLanguages = new Set<string>();
  for (const member of staffResult.rows) {
    (member.spoken_languages ?? []).forEach((lang: string) => allLanguages.add(lang));
  }
  if (allLanguages.size === 0) allLanguages.add("English").add("Dutch").add("French");

  // Schema.org Organization + Person (founder)
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Layover Legends",
    "url": SITE.url,
    "logo": `${SITE.url}/logo/wordmark-horizontal.svg`,
    "email": "travellayoverlegends@gmail.com",
    "address": { "@type": "PostalAddress", "addressLocality": "Amsterdam", "addressCountry": "NL" },
    "founder": {
      "@type": "Person",
      "name": "Steven Dupont",
      "jobTitle": "Founder & Lead Guide",
    },
    "knowsAbout": ["Amsterdam", "Layover tours", "Schiphol Airport", "City tours"],
  };

  return (
    <>
      <StructuredData data={[orgLd]} />
      <main className="min-h-screen bg-ink-black text-warm-cream">
        {/* Hero */}
        <section className="px-6 py-16 max-w-3xl mx-auto text-center space-y-6">
          <Link href="/" className="text-xs text-warm-cream/50 hover:text-warm-cream/80 block">
            ← {t(s, "common.back_to_home", "Back to home")}
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            {t(s, "about.hero_h1", "How a missed flight became\nAmsterdam's friendliest tour company")}
          </h1>
          <p className="text-xl text-legend-gold">
            {t(s, "about.hero_tagline", "Don't waste your layover.")}
          </p>
        </section>

        {/* Founder story */}
        <section className="px-6 py-12 max-w-3xl mx-auto space-y-6">
          <h2 className="font-display text-2xl font-semibold">
            {t(s, "about.founder_h2", "The founder")}
          </h2>
          <div className="space-y-4 text-warm-cream/75 leading-relaxed">
            <p>
              {t(s, "about.founder_p1",
                "Steven Dupont spent years flying through Schiphol, watching travelers sit in the terminal scrolling their phones while one of the world's great cities sat 20 minutes away. He'd done it himself. Everyone has."
              )}
            </p>
            <p>
              {t(s, "about.founder_p2",
                "In 2025 he stopped watching and started building. Layover Legends was born from a simple belief: a 4-hour layover is not dead time. It's an invitation. The right guide, the right tour, and Amsterdam stops being a dot on your flight map and becomes a story you actually tell."
              )}
            </p>
            <p>
              {t(s, "about.founder_p3",
                "Every tour departs from Schiphol and returns to the terminal with time to clear security. No car, no stress, no missed flights. Just Amsterdam — curated, local, and timed to your connection."
              )}
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 py-12 border-y border-warm-cream/10">
          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: tours_operated > 0 ? `${tours_operated}+` : "Coming soon", label: t(s, "about.stat_tours", "Tours operated") },
              { value: `${cities_count}`, label: t(s, "about.stat_cities", cities_count === 1 ? "City" : "Cities") },
              { value: `${allLanguages.size}`, label: t(s, "about.stat_languages", "Languages spoken") },
              { value: "24/7", label: t(s, "about.stat_support", "Support response") },
            ].map(({ value, label }) => (
              <div key={label} className="space-y-1">
                <p className="font-display text-3xl font-semibold text-legend-gold">{value}</p>
                <p className="text-sm text-warm-cream/60">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission / values */}
        <section className="px-6 py-12 max-w-3xl mx-auto space-y-6">
          <h2 className="font-display text-2xl font-semibold">
            {t(s, "about.values_h2", "What we believe")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🏘", title: t(s, "about.value1_title", "Local over tourist"), body: t(s, "about.value1_body", "We visit the Amsterdam that locals love, not the Instagram highlights everyone else posts.") },
              { icon: "✦", title: t(s, "about.value2_title", "Curated over crowded"), body: t(s, "about.value2_body", "Small groups only. We're not a bus tour. You'll remember the guide's name.") },
              { icon: "🌱", title: t(s, "about.value3_title", "Sustainable choices"), body: t(s, "about.value3_body", "Electric vehicles where available, local partnerships, no extractive tourism.") },
              { icon: "⏱", title: t(s, "about.value4_title", "Reliable on time"), body: t(s, "about.value4_body", "You have a flight to catch. We've never missed a return. That's the whole promise.") },
            ].map(({ icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-2">
                <p className="text-2xl">{icon}</p>
                <p className="font-semibold text-warm-cream/90">{title}</p>
                <p className="text-sm text-warm-cream/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        {staffResult.rows.length > 0 && (
          <section className="px-6 py-12 max-w-3xl mx-auto space-y-6">
            <h2 className="font-display text-2xl font-semibold">
              {t(s, "about.team_h2", "The team")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {staffResult.rows.map((member) => (
                <div key={member.id} className="flex items-start gap-4 rounded-2xl border border-warm-cream/10 p-4">
                  {member.photo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={member.photo_url} alt={member.full_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-legend-gold/40 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-legend-gold/20 border-2 border-legend-gold/40 flex items-center justify-center text-xl font-bold shrink-0">
                      {(member.preferred_name || member.full_name).charAt(0)}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="font-semibold text-warm-cream/90">
                      {member.preferred_name || member.full_name}
                    </p>
                    <p className="text-xs text-warm-cream/50 capitalize">
                      {member.role.replace(/_/g, " ")}
                    </p>
                    {member.bio_short && (
                      <p className="text-xs text-warm-cream/60 leading-relaxed mt-1">{member.bio_short}</p>
                    )}
                    {member.spoken_languages?.length > 0 && (
                      <p className="text-xs text-warm-cream/40">
                        {member.spoken_languages.join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="px-6 py-12 max-w-3xl mx-auto text-center space-y-4">
          <Link href="/tours"
            className="inline-flex items-center px-8 py-4 rounded-full bg-legend-gold text-ink-black font-semibold text-lg hover:bg-gold-light transition-colors">
            {t(s, "about.cta", "See our tours →")}
          </Link>
          <p className="text-sm text-warm-cream/50">
            {t(s, "about.or_contact", "Or")}{" "}
            <Link href="/contact" className="text-legend-gold hover:text-gold-light">
              {t(s, "about.contact_link", "get in touch")}
            </Link>{" "}
            {t(s, "about.contact_suffix", "with a question.")}
          </p>
        </section>

        <nav className="px-6 py-8 border-t border-warm-cream/10 text-xs text-warm-cream/40 max-w-3xl mx-auto flex flex-wrap gap-4">
          <Link href="/faq"          className="hover:text-warm-cream/70">FAQ</Link>
          <span>·</span>
          <Link href="/contact"      className="hover:text-warm-cream/70">Contact</Link>
          <span>·</span>
          <Link href="/legal/privacy" className="hover:text-warm-cream/70">Privacy</Link>
        </nav>
      </main>
    </>
  );
}
