import { requireAdmin } from "@/lib/auth/require-admin";
import { listCities } from "@/lib/admin/cities";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

export default async function AdminCitiesPage() {
  await requireAdmin();
  const [cities, s] = await Promise.all([listCities(), getUiStrings()]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {t(s, "admin.cities.title", "Cities")}
        </h1>
        <p className="text-sm text-warm-cream/60">{cities.length} total</p>
      </header>

      <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-warm-cream/[0.04] text-xs uppercase tracking-wide text-warm-cream/55">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.cities.col_name", "City")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.cities.col_country", "Country")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.cities.col_currency", "Currency")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.cities.col_airport", "Airport")}</th>
                <th className="px-4 py-3 text-left font-medium">{t(s, "admin.cities.col_status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-cream/10">
              {cities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-warm-cream/55">
                    {t(s, "admin.cities.empty_default", "No cities yet.")}
                  </td>
                </tr>
              ) : (
                cities.map((city) => (
                  <tr key={city.id} className="hover:bg-warm-cream/[0.03]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-warm-cream">{city.name}</div>
                      <div className="text-xs text-warm-cream/40 font-mono">{city.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-warm-cream/75">{city.country_code}</td>
                    <td className="px-4 py-3 text-warm-cream/75 font-mono">{city.currency}</td>
                    <td className="px-4 py-3 text-warm-cream/75 font-mono">{city.airport_iata ?? "—"}</td>
                    <td className="px-4 py-3">
                      {city.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-400/15 text-emerald-200">
                          {t(s, "admin.common.active", "Active")}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-warm-cream/10 text-warm-cream/60">
                          {t(s, "admin.common.draft", "Draft")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
