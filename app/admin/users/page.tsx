import Image from "next/image";
import Link from "next/link";
import { listUsers } from "@/lib/admin/metrics";
import { getCountry } from "@/lib/constants/countries";
import { getLanguage } from "@/lib/constants/locales";
import UsersSearch from "@/components/admin/UsersSearch";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { q?: string; page?: string };
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const q = (searchParams?.q ?? "").trim();
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);

  const { rows, totalMatching, pageSize } = await listUsers({ search: q, page });
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const buildPageHref = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (n !== 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-brand-cream/60">
            {totalMatching} total{q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <UsersSearch initialValue={q} />
      </header>

      <div className="rounded-2xl border border-brand-cream/10 bg-brand-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-brand-cream/[0.04] text-xs uppercase tracking-wide text-brand-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Person</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Country</th>
                <th className="px-4 py-3 text-left font-medium">Lang</th>
                <th className="px-4 py-3 text-left font-medium">Marketing</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cream/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-brand-cream/55">
                    {q ? `No users match "${q}".` : "No users yet."}
                  </td>
                </tr>
              ) : (
                rows.map((u) => {
                  const country = getCountry(u.nationality);
                  const lang = u.preferred_language ? getLanguage(u.preferred_language) : null;
                  return (
                    <tr key={u.id} className="hover:bg-brand-cream/[0.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {u.avatar_url ? (
                            <Image
                              src={u.avatar_url}
                              alt={u.full_name ?? u.email}
                              width={32}
                              height={32}
                              className="rounded-full border border-brand-cream/20 flex-shrink-0"
                              unoptimized
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-cream/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-brand-cream truncate flex items-center gap-2">
                              <span className="truncate">{u.full_name ?? "—"}</span>
                              {u.is_admin && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-orange/20 text-brand-orange">
                                  admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-brand-cream/55 truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-brand-cream/80 whitespace-nowrap">
                        {u.phone || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {country ? (
                          <span title={country.name}>
                            {country.flag} {country.code}
                          </span>
                        ) : (
                          <span className="text-brand-cream/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lang ? (
                          <span title={lang.name}>
                            {lang.flag} {lang.code.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-brand-cream/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {u.marketing_opt_in ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-cream/10 text-brand-cream/60">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-cream/70 whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-cream/10 text-xs text-brand-cream/60">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildPageHref(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-brand-cream/15 hover:bg-brand-cream/5 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildPageHref(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-brand-cream/15 hover:bg-brand-cream/5 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
