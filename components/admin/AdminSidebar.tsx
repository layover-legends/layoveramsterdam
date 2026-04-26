"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

const NAV: Array<{ key: string; label: string; href: string; icon: string; matchPrefix: string }> = [
  { key: "overview", label: "Overview", href: "/admin", icon: "▦", matchPrefix: "/admin" },
  { key: "users", label: "Users", href: "/admin/users", icon: "◇", matchPrefix: "/admin/users" },
];

export default function AdminSidebar({ email, fullName, avatarUrl }: Props) {
  const pathname = usePathname() || "";
  const initial = (fullName || email).charAt(0).toUpperCase();

  // The most specific (longest) matching prefix wins so /admin/users beats /admin.
  const activeKey = [...NAV]
    .sort((a, b) => b.matchPrefix.length - a.matchPrefix.length)
    .find((n) => pathname === n.matchPrefix || pathname.startsWith(n.matchPrefix + "/"))?.key;

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
          const isActive = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " +
                (isActive
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
