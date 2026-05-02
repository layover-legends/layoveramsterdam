import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import SignInWithGoogle from "@/components/SignInWithGoogle";
import StopsTeaser from "@/components/StopsTeaser";
import { createClient } from "@/lib/supabase/server";
import { getStopsTeaser } from "@/lib/public/stops";
import { SITE, canonicalFor, ogImageFor, langAlternates } from "@/lib/seo/site";
import { StructuredData } from "@/components/seo/StructuredData";
import { organizationLd, websiteLd } from "@/lib/seo/jsonld";
import { resolveLocale } from "@/lib/i18n/resolve";
import { OG_LOCALE } from "@/lib/i18n/locales";
import { loadUiStrings, t, tpl } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale();
  const strings = await loadUiStrings(locale);
  const title = `${SITE.name} — ${t(strings, "site.tagline", "Curated Amsterdam Layover Tours")}`;
  const description = t(
    strings,
    "homepage.tagline",
    "Turn your Schiphol layover into a legend. Premium city tours between flights — launching soon.",
  );
  const ogImage = ogImageFor({ title: SITE.name, subtitle: t(strings, "site.tagline", "Curated Amsterdam layovers") });
  return {
    title,
    description,
    alternates: { canonical: canonicalFor("/"), languages: langAlternates("/") },
    openGraph: {
      title,
      description,
      url: canonicalFor("/"),
      siteName: SITE.name,
      type: "website",
      locale: OG_LOCALE[locale],
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      creator: SITE.twitter,
      title,
      description,
      images: [ogImage],
    },
  };
}

const COMING_SOON_IMAGE =
  "https://idgobxvhbhdymfsfmhae.supabase.co/storage/v1/object/public/assets/homepage/comingsoon.PNG";

type HomePageProps = {
  searchParams?: {
    auth_error?: string;
    auth_required?: string;
    admin_only?: string;
  };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = createClient();
  const locale = resolveLocale();

  const [{ data: { user } }, stopsTeaser, strings] = await Promise.all([
    supabase.auth.getUser(),
    getStopsTeaser(),
    loadUiStrings(locale),
  ]);

  const authError = searchParams?.auth_error === "1";
  const authRequired = searchParams?.auth_required === "1";
  const adminOnly = searchParams?.admin_only === "1";
  const year = String(new Date().getFullYear());

  // Build GDPR notice with inline links (server-rendered, no client JS needed).
  const gdprNotice = (
    <>
      {t(strings, "auth.gdpr_notice", "By signing in, you agree to our {privacy} and {terms}.")
        .split("{privacy}")[0]}
      <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-brand-cream/70">
        {t(strings, "auth.gdpr_privacy", "Privacy Policy")}
      </Link>
      {t(strings, "auth.gdpr_notice", "By signing in, you agree to our {privacy} and {terms}.")
        .split("{privacy}")[1]
        ?.split("{terms}")[0]}
      <Link href="/legal/terms" className="underline underline-offset-2 hover:text-brand-cream/70">
        {t(strings, "auth.gdpr_terms", "Terms of Service")}
      </Link>
      {t(strings, "auth.gdpr_notice", "By signing in, you agree to our {privacy} and {terms}.")
        .split("{terms}")[1]}
    </>
  );

  return (
    <>
    <StructuredData data={[organizationLd(), websiteLd()]} />
    <main className="min-h-screen flex flex-col items-center px-6 py-12 bg-brand-navy text-brand-cream">
      <section className="w-full max-w-3xl flex flex-col items-center text-center gap-8 pt-8 sm:pt-16">
        <div className="relative w-full aspect-square max-w-xl">
          <Image
            src={COMING_SOON_IMAGE}
            alt={t(strings, "homepage.coming_soon", "Layover Amsterdam — Coming Soon")}
            fill
            priority
            sizes="(max-width: 768px) 90vw, 600px"
            className="object-contain drop-shadow-2xl"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Layover Amsterdam
          </h1>
          <p className="text-lg sm:text-xl text-brand-orange font-semibold">
            {t(strings, "homepage.coming_soon", "Coming Soon")}
          </p>
          <p className="text-sm sm:text-base text-brand-cream/80 max-w-xl mx-auto">
            {t(
              strings,
              "homepage.tagline",
              "Turn your Schiphol layover into a legend. Premium city tours between flights — launching soon.",
            )}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          {user ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {t(strings, "homepage.go_to_account", "Go to your account")}
            </Link>
          ) : (
            <SignInWithGoogle
              label={t(strings, "auth.signin_google", "Sign in with Google for early access")}
              loadingLabel={t(strings, "auth.redirecting", "Redirecting…")}
              gdprNotice={gdprNotice}
            />
          )}
          <p className="text-xs text-brand-cream/60 max-w-sm">
            {user
              ? tpl(t(strings, "homepage.signed_in_as", "Signed in as {email}."), { email: user.email ?? "" })
              : t(
                  strings,
                  "homepage.early_access",
                  "Join the early-access list. We'll only email you once — when tours open.",
                )}
          </p>
          {authError && (
            <p className="text-xs text-red-300" role="alert">
              {t(strings, "homepage.auth_error", "Sign-in didn't complete. Please try again.")}
            </p>
          )}
          {authRequired && !user && (
            <p className="text-xs text-brand-orange" role="status">
              {t(strings, "homepage.auth_required", "Please sign in to view your account.")}
            </p>
          )}
          {adminOnly && (
            <p className="text-xs text-brand-orange/80" role="status">
              {t(strings, "homepage.admin_only", "That area is for admins only.")}
            </p>
          )}
        </div>

      </section>

      <StopsTeaser data={stopsTeaser} strings={strings} />

      <footer className="text-xs text-brand-cream/50 pt-12 pb-4 text-center space-y-2">
        <div>
          {tpl(
            t(strings, "footer.copyright", "© {year} Layover Amsterdam. All rights reserved."),
            { year },
          )}
        </div>
        <nav className="flex items-center justify-center gap-4">
          <Link href="/legal/privacy" className="hover:text-brand-cream/80 transition-colors">
            {t(strings, "footer.privacy", "Privacy policy")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/terms" className="hover:text-brand-cream/80 transition-colors">
            {t(strings, "footer.terms", "Terms of service")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/cancellation" className="hover:text-brand-cream/80 transition-colors">
            {t(strings, "footer.cancellation", "Cancellation policy")}
          </Link>
        </nav>
      </footer>
    </main>
    </>
  );
}
