"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: string;
  matchPrefix: string;
  // When set, this item is only active when the URL also has ?filterKey=filterValue.
  filterKey?: string;
  filterValue?: string;
  // When set, this item is inactive when the URL has ?filterKey=filterValue.
  excludeFilterKey?: string;
  excludeFilterValues?: string[];
};

const NAV: NavItem[] = [
  { key: "overview",   label: "Overview",    href: "/admin",                    icon: "▦",  matchPrefix: "/admin" },
  { key: "users",      label: "Users",       href: "/admin/users",              icon: "◇",  matchPrefix: "/admin/users" },
  {
    key: "stops",      label: "Free stops",  href: "/admin/stops?filter=free",  icon: "✦",  matchPrefix: "/admin/stops",
    filterKey: "filter", filterValue: "free",
  },
  {
    key: "paid",       label: "Paid stops",  href: "/admin/stops?filter=paid",  icon: "€",  matchPrefix: "/admin/stops",
    filterKey: "filter", filterValue: "paid",
  },
  {
    key: "adult",      label: "After Dark",  href: "/admin/stops?filter=adult", icon: "🌙", matchPrefix: "/admin/stops",
    filterKey: "filter", filterValue: "adult",
  },
  { key: "tours",      label: "Tours",       href: "/admin/tours",              icon: "◆",  matchPrefix: "/admin/tours" },
];

export default function AdminSidebar({ email, fullName, avatarUrl }: Props) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const initial = (fullName || email).charAt(0).toUpperCase();

  function isActive(item: NavItem): boolean {
    const pathMatch =
      pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/");
    if (!pathMatch) return false;

    // Items with a required filter param.
    if (item.filterKey && item.filterValue) {
      return searchParams.get(item.filterKey) === item.filterValue;
    }

    // "Overview" — exact match only (so /admin/stops doesn't activate it).
    if (item.matchPrefix === "/admin") {
      return pathname === "/admin";
    }

    // Items with no filter constraint — active unless another sibling's filter matches.
    return true;
  }

  return (
    <aside className="w-full lg:w-64 lg:min-h-screen lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-brand-cream/10 bg-brand-navy flex flex-col">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-brand-cream/10">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={fullName || email}
            width={36}
            height={36}
            className="rounded-full border border-brand-orange/60"
            unoptimized
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-orange/20 border border-brand-orange/60 flex items-center justify-center text-sm font-bold">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-brand-orange font-semibold">
            Admin
          </p>
          <p className="text-sm text-brand-cream truncate">{fullName || email}</p>
        </div>
      </div>

      <nav className="px-3 py-4 flex lg:flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " +
                (active
                  ? "bg-brand-orange/15 text-brand-orange font-medium"
                  : "text-brand-cream/75 hover:bg-brand-cream/5")
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden lg:flex flex-col gap-2 px-5 py-5 text-xs text-brand-cream/40 border-t border-brand-cream/10">
        <Link href="/" className="hover:text-brand-cream/70 transition-colors">
          ← Back to site
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="hover:text-brand-cream/70 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
