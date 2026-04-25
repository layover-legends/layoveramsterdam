import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "@/components/AccountForm";
import type { UserProfile } from "@/lib/types/profile";

export const dynamic = "force-dynamic";

type AccountPageProps = {
  searchParams?: { saved?: string; error?: string };
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth_required=1");
  }

  // Fetch the profile row created by the on_auth_user_created trigger.
  // RLS guarantees this returns at most the signed-in user's own row.
  const { data: profileRow } = await supabase
    .from("users")
    .select(
      "id, email, full_name, phone, nationality, preferred_language, stripe_customer_id, avatar_url, is_verified, marketing_opt_in, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Fallback to OAuth metadata if the profile row is unexpectedly missing
  // (shouldn't happen — trigger handles it — but defensive code is cheap).
  const profile: UserProfile = profileRow ?? {
    id: user.id,
    email: user.email ?? "",
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    phone: null,
    nationality: null,
    preferred_language: null,
    stripe_customer_id: null,
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    is_verified: false,
    marketing_opt_in: true,
    created_at: null,
    updated_at: null,
  };

  const displayName =
    profile.full_name?.trim() || profile.email.split("@")[0] || "there";
  const firstName = displayName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  const saved = searchParams?.saved === "1";
  const error = searchParams?.error;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 bg-brand-navy text-brand-cream">
      <section className="w-full max-w-2xl flex flex-col gap-8">
        <header className="flex flex-col items-center text-center gap-4">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={88}
              height={88}
              className="rounded-full border-2 border-brand-orange shadow-lg"
              unoptimized
            />
          ) : (
            <div className="w-22 h-22 w-[88px] h-[88px] rounded-full bg-brand-orange/20 border-2 border-brand-orange flex items-center justify-center text-3xl font-bold">
              {initial}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome, {firstName}
            </h1>
            <p className="text-sm text-brand-cream/70">
              Your Layover Amsterdam account
            </p>
          </div>
        </header>

        {saved && (
          <div
            role="status"
            className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
          >
            Saved.
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100"
          >
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-brand-orange mb-1">
            Your details
          </h2>
          <p className="text-sm text-brand-cream/70 mb-6">
            We&apos;ll use these for your bookings, your launch invite, and to
            show prices in your currency. Nothing is shared.
          </p>
          <AccountForm profile={profile} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <a
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full border border-brand-cream/30 text-brand-cream font-medium hover:bg-brand-cream/10 transition-colors"
          >
            Back to home
          </a>
          <form action="/auth/signout" method="post" className="w-full sm:w-auto sm:ml-auto">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full border border-brand-cream/30 text-brand-cream/80 font-medium hover:bg-brand-cream/10 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="text-xs text-brand-cream/40 text-center pt-2">
          © {new Date().getFullYear()} Layover Amsterdam. All rights reserved.
        </div>
      </section>
    </main>
  );
}
