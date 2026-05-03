"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoMark from "@/components/LogoMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Locale } from "@/lib/i18n/locales";

type Props = {
  locale: Locale;
  langLabel?: string;
};

export default function PublicNav({ locale, langLabel = "Select language" }: Props) {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const navLinks = [
    { label: "Tours",        href: "/tours" },
    { label: "Destinations", href: "/stops" },
    { label: "Shop",         href: "/shop" },
    { label: "Blog",         href: "/blog" },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        solid
          ? "bg-ink-black/95 backdrop-blur-md border-b border-warm-cream/10 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <LogoMark size={32} />
          <span className="font-display text-sm tracking-[0.18em] text-legend-gold font-semibold uppercase leading-none hidden sm:block">
            Layover Legends
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(link.href)
                  ? "text-legend-gold bg-legend-gold/10"
                  : "text-warm-cream/70 hover:text-warm-cream hover:bg-warm-cream/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side: language + CTA */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher currentLocale={locale} ariaLabel={langLabel} />
          </div>
          <Link
            href="#hero"
            className="px-4 py-2 rounded-full bg-legend-gold text-ink-black text-xs font-semibold uppercase tracking-widest hover:bg-gold-light active:bg-gold-dark transition-colors shadow-lg"
          >
            Book
          </Link>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-warm-cream/70 hover:text-warm-cream"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="block w-5 h-0.5 bg-current mb-1 transition-transform" style={{ transform: menuOpen ? "rotate(45deg) translate(2px,6px)" : undefined }} />
            <span className="block w-5 h-0.5 bg-current mb-1 transition-opacity" style={{ opacity: menuOpen ? 0 : 1 }} />
            <span className="block w-5 h-0.5 bg-current transition-transform" style={{ transform: menuOpen ? "rotate(-45deg) translate(2px,-6px)" : undefined }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-ink-black/98 backdrop-blur-md border-t border-warm-cream/10 px-5 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 rounded-lg text-sm text-warm-cream/80 hover:text-warm-cream hover:bg-warm-cream/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 pb-1">
            <LanguageSwitcher currentLocale={locale} ariaLabel={langLabel} />
          </div>
        </div>
      )}
    </header>
  );
}
