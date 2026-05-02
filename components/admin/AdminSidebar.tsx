"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  /** UI labels resolved server-side in admin/layout.tsx */
  labels?: Record<string, string>;
};

function lbl(labels: Record<string, string> | undefined, key: string, fallback: string): string {
  return labels?.[key] ?? fallback;
}

type NavItem = {
  key: string;
  labelKey: string;
  labelFallback: string;
  href: string;
  icon: string;
  matchPrefix: string;
  filterKey?: string;
  filterValue?: string;
};

const NAV: NavItem[] = [
  { key: "overview", labelKey: "admin.sidebar.overview",   labelFallback: "Overview",   href: "/admin",                    icon: "▦", matchPrefix: "/admin" },
  { key: "users",    labelKey: "admin.sidebar.users",      labelFallback: "Users",      href: "/admin/users",              icon: "◇", matchPrefix: "/admin/users" },
  { key: "stops",    labelKey: "admin.sidebar.free_stops", labelFallback: "Free stops", href: "/admin/stops?filter=free",  icon: "✦", matchPrefix: "/admin/stops", filterKey: "filter", filterValue: "free" },
  { key: "paid",     labelKey: "admin.sidebar.paid_stops", labelFallback: "Paid stops", href: "/admin/stops?filter=paid",  icon: "€", matchPrefix: "/admin/stops", filterKey: "filter", filterValue: "paid" },
  { key: "adult",    labelKey: "admin.sidebar.after_dark", labelFallback: "After Dark", href: "/admin/stops?filter=adult", icon: "🌙", matchPrefix: "/admin/stops", filterKey: "filter", filterValue: "adult" },
  { key: "tours",    labelKey: "admin.sidebar.tours",      labelFallback: "Tours",      href: "/admin/tours",              icon: "◆", matchPrefix: "/admin/tours" },
  { key: "articles", labelKey: "admin.sidebar.articles",   labelFallback: "Articles",   href: "/admin/articles",           icon: "✍", matchPrefix: "/admin/articles" },
  { key: "seo",      labelKey: "admin.sidebar.seo",        labelFallback: "SEO",        href: "/admin/seo",                icon: "↗", matchPrefix: "/admin/seo" },
];

export default function AdminSidebar({ email, fullName, avatarUrl, labels }: Props) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const initial = (fullName || email).charAt(0).toUpperCase();

  function isActive(item: NavItem): boolean {
    const pathMatch =
      pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/");
    if (!pathMatch) return false;
    if (item.filterKey && item.filterValue) {
      return searchParams.get(item.filterKey) === item.filterValue;
    }
    if (item.matchPrefix === "/admin") return pathname === "/admin";
    return true;
  }

  return (
    <aside className="w-full lg:w-64 lg:min-h-screen lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-warm-cream/10 bg-ink-black flex flex-col">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-warm-cream/10">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={fullName || email} width={36} height={36}
            className="rounded-full border border-legend-gold/60" unoptimized />
        ) : (
          <div className="w-9 h-9 rounded-full bg-legend-gold/20 border border-legend-gold/60 flex items-center justify-center text-sm font-bold">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-legend-gold font-semibold">
            {lbl(labels, "admin.sidebar.admin", "Admin")}
          </p>
          <p className="text-sm text-warm-cream truncate">{fullName || email}</p>
        </div>
      </div>

      <nav className="px-3 py-4 flex lg:flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link key={item.key} href={item.href}
              className={
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " +
                (active
                  ? "bg-legend-gold/15 text-legend-gold font-medium"
                  : "text-warm-cream/75 hover:bg-warm-cream/5")
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {lbl(labels, item.labelKey, item.labelFallback)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden lg:flex flex-col gap-2 px-5 py-5 text-xs text-warm-cream/40 border-t border-warm-cream/10">
        <Link href="/" className="hover:text-warm-cream/70 transition-colors">
          {lbl(labels, "admin.sidebar.back_to_site", "← Back to site")}
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="hover:text-warm-cream/70 transition-colors">
            {lbl(labels, "admin.sidebar.signout", "Sign out")}
          </button>
        </form>
      </div>
    </aside>
  );
}
