import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth_required=1");
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const firstName = fullName.split(" ")[0];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-brand-navy text-brand-cream">
      <section className="w-full max-w-xl flex flex-col items-center text-center gap-8">
        <div className="flex flex-col items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              width={96}
              height={96}
              className="rounded-full border-2 border-brand-orange shadow-lg"
              unoptimized
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand-orange/20 border-2 border-brand-orange flex items-center justify-center text-3xl font-bold">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome, {firstName}!
            </h1>
            <p className="text-sm text-brand-cream/70">{user.email}</p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-6 space-y-3 text-left">
          <h2 className="text-lg font-semibold text-brand-orange">
            You&apos;re on the early-access list
          </h2>
          <p className="text-sm text-brand-cream/80">
            Thanks for signing up. We&apos;re building premium city tours designed
            for Schiphol layovers — short enough to catch your next flight, long
            enough to feel like you actually visited Amsterdam.
          </p>
          <p className="text-sm text-brand-cream/80">
            We&apos;ll email <span className="font-medium">{user.email}</span>{" "}
            the moment tours go live. No spam — just the launch announcement.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <a
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full border border-brand-cream/30 text-brand-cream font-medium hover:bg-brand-cream/10 transition-colors"
          >
            Back to home
          </a>
          <form action="/auth/signout" method="post" className="w-full sm:w-auto">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="text-xs text-brand-cream/50 pt-6">
          © {new Date().getFullYear()} Layover Amsterdam. All rights reserved.
        </div>
      </section>
    </main>
  );
}
