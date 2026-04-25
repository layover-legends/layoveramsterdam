"use client";

import { useFormStatus } from "react-dom";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/locales";
import { COUNTRIES } from "@/lib/constants/countries";
import type { UserProfile } from "@/lib/types/profile";
import { updateProfile } from "@/app/account/actions";

type Props = {
  profile: UserProfile;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export default function AccountForm({ profile }: Props) {
  return (
    <form action={updateProfile} className="w-full space-y-5 text-left">
      <div>
        <label
          htmlFor="full_name"
          className="block text-xs uppercase tracking-wide text-brand-cream/60 mb-1"
        >
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          maxLength={100}
          defaultValue={profile.full_name ?? ""}
          autoComplete="name"
          className="w-full px-4 py-3 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60"
          placeholder="As you'd like it on your booking"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-xs uppercase tracking-wide text-brand-cream/60 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          name="email_display"
          type="email"
          value={profile.email}
          disabled
          className="w-full px-4 py-3 rounded-xl bg-brand-cream/[0.02] border border-brand-cream/10 text-brand-cream/60 cursor-not-allowed"
        />
        <p className="text-xs text-brand-cream/40 mt-1">
          Managed by your Google account.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="phone"
            className="block text-xs uppercase tracking-wide text-brand-cream/60 mb-1"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            defaultValue={profile.phone ?? ""}
            autoComplete="tel"
            className="w-full px-4 py-3 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60"
            placeholder="+31 6 12 34 56 78"
          />
        </div>

        <div>
          <label
            htmlFor="nationality"
            className="block text-xs uppercase tracking-wide text-brand-cream/60 mb-1"
          >
            Nationality
          </label>
          <select
            id="nationality"
            name="nationality"
            defaultValue={profile.nationality ?? ""}
            className="w-full px-4 py-3 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60 [&>option]:bg-brand-navy [&>option]:text-brand-cream"
          >
            <option value="" style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}>
              Select…
            </option>
            {COUNTRIES.map((c) => (
              <option
                key={c.code}
                value={c.code}
                style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}
              >
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="preferred_language"
          className="block text-xs uppercase tracking-wide text-brand-cream/60 mb-1"
        >
          Preferred language
        </label>
        <select
          id="preferred_language"
          name="preferred_language"
          defaultValue={profile.preferred_language ?? "en"}
          className="w-full px-4 py-3 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60 [&>option]:bg-brand-navy [&>option]:text-brand-cream"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option
              key={l.code}
              value={l.code}
              style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}
            >
              {l.flag} {l.nativeName} ({l.name})
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 p-4 rounded-xl bg-brand-cream/5 border border-brand-cream/10 cursor-pointer hover:bg-brand-cream/[0.07] transition-colors">
        <input
          type="checkbox"
          name="marketing_opt_in"
          defaultChecked={profile.marketing_opt_in}
          className="mt-1 h-4 w-4 rounded border-brand-cream/40 bg-brand-cream/10 text-brand-orange focus:ring-brand-orange/60"
        />
        <span className="text-sm text-brand-cream/80">
          <span className="font-medium text-brand-cream">
            Email me at launch
          </span>
          <span className="block text-xs text-brand-cream/60 mt-0.5">
            One email when tours go live, plus occasional travel-tip emails. You
            can turn this off any time.
          </span>
        </span>
      </label>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
