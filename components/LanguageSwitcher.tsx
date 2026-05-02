"use client";

import { useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

type Props = {
  currentLocale: Locale;
  ariaLabel?: string;
};

export default function LanguageSwitcher({ currentLocale, ariaLabel = "Select language" }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value as Locale;
    // Set the cookie for 1 year, SameSite=Lax so it follows navigations.
    document.cookie = `lang=${lang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    router.refresh();
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      aria-label={ariaLabel}
      className="bg-transparent border border-brand-cream/20 text-brand-cream/70 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/60 hover:border-brand-cream/40 transition-colors cursor-pointer"
    >
      {LOCALES.map((l) => (
        <option
          key={l.code}
          value={l.code}
          style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}
        >
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
