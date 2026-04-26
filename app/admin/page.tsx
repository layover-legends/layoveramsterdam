import Image from "next/image";
import Link from "next/link";
import { getAdminOverview } from "@/lib/admin/metrics";
import MetricCard from "@/components/admin/MetricCard";
import { getCountry } from "@/lib/constants/countries";
import { getLanguage } from "@/lib/constants/locales";

export const dynamic = "force-dynamic";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatPct(rate: number): string {
  if (Number.isNaN(rate) || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

export default async function AdminOverviewPage() {
  const m = await getAdminOverview();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-brand-cream/60">
          A live read of your early-access list.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Total signups" value={m.totalUsers} accent="orange" />
        <MetricCard label="Today" value={m.signupsToday} />
        <MetricCard label="Last 7 days" value={m.signupsThisWeek} />
        <MetricCard label="This month" value={m.signupsThisMonth} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-6">
          <h2 className="text-sm uppercase tracking-wide text-brand-cream/55 mb-4">
            Marketing opt-in
          </h2>
          <p className="text-4xl font-bold text-emerald-300">
            {formatPct(m.marketingOptInRate)}
          </p>
          <p className="text-xs text-brand-cream/50 mt-1">
            {m.marketingOptInCount} of {m.totalUsers} agreed to launch emails
          </p>
        </div>

        <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-6">
          <h2 className="text-sm uppercase tracking-wide text-brand-cream/55 mb-4">
            Top countries
          </h2>
          {m.topCountries.length === 0 ? (
            <p className="text-sm text-brand-cream/50">No nationality data yet.</p>
          ) : (
            <ul className="space-y-2">
              {m.topCountries.map((c) => {
                const country = getCountry(c.code);
                return (
                  <li key={c.code} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span>{country?.flag ?? "🏳️"}</span>
                      <span>{country?.name ?? c.code}</span>
                    </span>
                    <span className="text-brand-cream/60 tabular-nums">{c.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-6">
          <h2 className="text-sm uppercase tracking-wide text-brand-cream/55 mb-4">
            Top languages
          </h2>
          {m.topLanguages.length === 0 ? (
            <p className="text-sm text-brand-cream/50">No language data yet.</p>
          ) : (
            <ul className="space-y-2">
              {m.topLanguages.map((l) => {
                const lang = getLanguage(l.code);
                return (
                  <li key={l.code} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                    </span>
                    <span className="text-brand-cream/60 tabular-nums">{l.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
            Recent signups
          </h2>
          <Link href="/admin/users" className="text-xs text-brand-orange hover:underline">
            View all →
          </Link>
        </div>
        {m.recentSignups.length === 0 ? (
          <p className="text-sm text-brand-cream/50">
            No signups yet. They&apos;ll appear here in real time.
          </p>
        ) : (
          <ul className="divide-y divide-brand-cream/10">
            {m.recentSignups.map((u) => {
              const country = getCountry(u.nationality);
              const lang = u.preferred_language ? getLanguage(u.preferred_language) : null;
              return (
                <li key={u.id} className="py-3 flex items-center gap-4">
                  {u.avatar_url ? (
                    <Image
                      src={u.avatar_url}
                      alt={u.full_name ?? u.email}
                      width={32}
                      height={32}
                      className="rounded-full border border-brand-cream/20"
                      unoptimized
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-cream/10 flex items-center justify-center text-xs font-bold">
                      {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-brand-cream truncate">
                      {u.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-brand-cream/50 truncate">{u.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-xs text-brand-cream/55">
                    {country && <span title={country.name}>{country.flag}</span>}
                    {lang && <span title={lang.name}>{lang.flag}</span>}
                  </div>
                  <span className="text-xs text-brand-cream/45 tabular-nums whitespace-nowrap">
                    {formatRelativeTime(u.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
