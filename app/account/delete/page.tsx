import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { deleteAccount } from "@/app/account/actions";

export const dynamic = "force-dynamic";

type Props = { searchParams?: { error?: string } };

export default async function DeleteAccountPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const s = await getUiStrings();
  const error = searchParams?.error;

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-black text-warm-cream px-6 py-12">
      <section className="w-full max-w-lg space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-red-400">
            {t(s, "account.delete.h1", "Delete your account")}
          </h1>
          <p className="text-sm text-warm-cream/60">
            {t(s, "account.delete.subtitle", "This action is permanent and cannot be undone.")}
          </p>
        </header>

        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5 space-y-3 text-sm text-warm-cream/75 leading-relaxed">
          <p className="font-semibold text-warm-cream/90">
            {t(s, "account.delete.what_happens", "What will be deleted:")}
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>{t(s, "account.delete.bullet_profile", "Your profile — name, phone, nationality, preferences")}</li>
            <li>{t(s, "account.delete.bullet_layovers", "All layover records")}</li>
            <li>{t(s, "account.delete.bullet_routes", "Custom routes you have built")}</li>
            <li>{t(s, "account.delete.bullet_waitlist", "Waitlist signups")}</li>
          </ul>
          <p className="font-semibold text-warm-cream/90 mt-2">
            {t(s, "account.delete.what_kept", "What is retained (legal obligation):")}
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>{t(s, "account.delete.bullet_bookings", "Booking financial records — anonymised and kept 7 years (Dutch tax law)")}</li>
          </ul>
        </div>

        {error === "type_delete" && (
          <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {t(s, "account.delete.error_type", "Please type DELETE in the box to confirm.")}
          </div>
        )}

        <form action={deleteAccount} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="confirmation" className="block text-sm font-medium text-warm-cream/80">
              {t(s, "account.delete.type_label", "Type DELETE to confirm")}
            </label>
            <input
              id="confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              placeholder="DELETE"
              className="w-full px-4 py-3 rounded-xl bg-warm-cream/5 border border-warm-cream/20 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-red-400/50 font-mono text-sm"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="w-full sm:flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-semibold hover:bg-red-500 active:bg-red-700 transition-colors"
            >
              {t(s, "account.delete.confirm_button", "Permanently delete my account")}
            </button>
            <Link
              href="/account"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full border border-warm-cream/30 text-warm-cream/80 font-medium hover:bg-warm-cream/10 transition-colors"
            >
              {t(s, "common.cancel", "Cancel")}
            </Link>
          </div>
        </form>

        <p className="text-xs text-warm-cream/30 text-center leading-relaxed">
          {t(s, "account.delete.gdpr_note",
            "This deletion is processed under GDPR Art. 17 (Right to Erasure). You will receive a confirmation email. Contact travellayoverlegends@gmail.com with questions."
          )}
        </p>
      </section>
    </main>
  );
}
