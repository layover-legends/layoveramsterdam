import Image from "next/image";
import Link from "next/link";
import SignInWithGoogle from "@/components/SignInWithGoogle";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authError = searchParams?.auth_error === "1";
  const authRequired = searchParams?.auth_required === "1";
  const adminOnly = searchParams?.admin_only === "1";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-brand-navy text-brand-cream">
      <section className="w-full max-w-3xl flex flex-col items-center text-center gap-8">
        <div className="relative w-full aspect-square max-w-xl">
          <Image
            src={COMING_SOON_IMAGE}
            alt="Layover Amsterdam — Coming Soon"
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
            Coming Soon
          </p>
          <p className="text-sm sm:text-base text-brand-cream/80 max-w-xl mx-auto">
            Turn your Schiphol layover into a legend. Premium city tours between flights —
            launching soon.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          {user ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Go to your account
            </Link>
          ) : (
            <SignInWithGoogle />
          )}
          <p className="text-xs text-brand-cream/60 max-w-sm">
            {user
              ? `Signed in as ${user.email}.`
              : "Join the early-access list. We’ll only email you once — when tours open."}
          </p>
          {authError && (
            <p className="text-xs text-red-300" role="alert">
              Sign-in didn&apos;t complete. Please try again.
            </p>
          )}
          {authRequired && !user && (
            <p className="text-xs text-brand-orange" role="status">
              Please sign in to view your account.
            </p>
          )}
          {adminOnly && (
            <p className="text-xs text-brand-orange/80" role="status">
              That area is for admins only.
            </p>
          )}
        </div>

        <div className="text-xs text-brand-cream/50 pt-6">
          © {new Date().getFullYear()} Layover Amsterdam. All rights reserved.
        </div>
      </section>
    </main>
  );
}
