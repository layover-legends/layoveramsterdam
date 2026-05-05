"use client";

type Props = { label: string };

export default function CookieSettingsButton({ label }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        const fn = (window as { __openCookieSettings?: () => void }).__openCookieSettings;
        if (fn) fn();
      }}
      className="hover:text-warm-cream/70 transition-colors cursor-pointer"
    >
      {label}
    </button>
  );
}
