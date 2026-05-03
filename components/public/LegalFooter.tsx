"use client";

import Link from "next/link";

type Props = {
  labels: Record<string, string>;
  year?: string;
  className?: string;
};

function lbl(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

/**
 * Minimal legal footer used on public pages.
 * Links to privacy, terms, cookies, and "Manage cookies" (triggers the client-side banner).
 */
export default function LegalFooter({ labels, year, className = "" }: Props) {
  const y = year ?? String(new Date().getFullYear());
  return (
    <footer className={`w-full py-6 px-6 border-t border-warm-cream/10 ${className}`}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
        <p className="text-xs text-warm-cream/30 sm:mr-auto">
          {lbl(labels, "footer.copyright", "© {year} Layover Legends. All rights reserved.").replace("{year}", y)}
        </p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-warm-cream/40">
          <Link href="/legal/privacy" className="hover:text-warm-cream/70 transition-colors">
            {lbl(labels, "footer.privacy", "Privacy policy")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/terms" className="hover:text-warm-cream/70 transition-colors">
            {lbl(labels, "footer.terms", "Terms of service")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/cancellation" className="hover:text-warm-cream/70 transition-colors">
            {lbl(labels, "footer.cancellation", "Cancellation policy")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/cookies" className="hover:text-warm-cream/70 transition-colors">
            {lbl(labels, "footer.cookies", "Cookie policy")}
          </Link>
          <span aria-hidden="true">·</span>
          {/* Triggers the client-side ConsentBanner settings modal */}
          <button
            type="button"
            onClick={() => {
              const fn = (window as { __openCookieSettings?: () => void }).__openCookieSettings;
              if (fn) fn();
            }}
            className="hover:text-warm-cream/70 transition-colors cursor-pointer"
          >
            {lbl(labels, "footer.manage_cookies", "Manage cookies")}
          </button>
        </nav>
      </div>
    </footer>
  );
}
