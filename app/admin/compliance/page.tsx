import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getComplianceSummary } from "@/lib/admin/compliance";
import type { ComplianceItem } from "@/lib/admin/staff-types";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

function ItemRow({ item }: { item: ComplianceItem }) {
  const expiry = new Date(item.expiryDate).toLocaleDateString("en-NL", {
    day: "numeric", month: "short", year: "numeric",
  });
  const href = item.entityType === "staff"
    ? `/admin/staff/${item.entityId}`
    : `/admin/vehicles/${item.entityId}`;

  return (
    <div className="flex items-center justify-between py-3 border-b border-warm-cream/8 last:border-0">
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-warm-cream/90">
          {item.entityName}
          <span className="text-warm-cream/50 font-normal"> · {item.label}</span>
        </div>
        <div className="text-xs text-warm-cream/50">
          {item.entityType === "staff" ? "Staff" : "Vehicle"} ·{" "}
          {item.daysUntil < 0
            ? <span className="text-red-300">Expired {Math.abs(item.daysUntil)}d ago</span>
            : <span>{item.daysUntil}d left ({expiry})</span>}
        </div>
      </div>
      <Link href={href}
        className="text-xs text-legend-gold hover:text-gold-light transition-colors shrink-0 ml-4">
        Update →
      </Link>
    </div>
  );
}

export default async function AdminCompliancePage() {
  await requireAdmin();
  const [summary, s] = await Promise.all([getComplianceSummary(), getUiStrings()]);

  const sections = [
    {
      key: "expired",
      label: t(s, "admin.compliance.expired_h", "🔴 Expired"),
      items: summary.expired,
      bg: "border-red-400/20 bg-red-400/5",
    },
    {
      key: "critical",
      label: t(s, "admin.compliance.critical_h", "🟠 Expires within 30 days"),
      items: summary.critical,
      bg: "border-orange-400/20 bg-orange-400/5",
    },
    {
      key: "warning",
      label: t(s, "admin.compliance.warning_h", "🟡 Expires within 90 days"),
      items: summary.warning,
      bg: "border-amber-400/20 bg-amber-400/5",
    },
    {
      key: "ok",
      label: t(s, "admin.compliance.ok_h", "🟢 All good (90+ days)"),
      items: summary.ok,
      bg: "border-warm-cream/10 bg-warm-cream/3",
    },
  ];

  const alerts = summary.expired.length + summary.critical.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {t(s, "admin.compliance.title", "Compliance")}
          </h1>
          <p className="text-sm text-warm-cream/60">
            {summary.total} items tracked ·{" "}
            {alerts > 0
              ? <span className="text-red-300 font-medium">{alerts} need action</span>
              : <span className="text-emerald-400">All current</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/staff"
            className="px-4 py-2 rounded-full border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5 transition-colors">
            Staff →
          </Link>
          <Link href="/admin/vehicles"
            className="px-4 py-2 rounded-full border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5 transition-colors">
            Vehicles →
          </Link>
        </div>
      </header>

      {summary.total === 0 && (
        <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
          <p>No compliance items tracked yet.</p>
          <p className="mt-2 text-sm">Add expiry dates to staff and vehicles to see alerts here.</p>
        </div>
      )}

      {sections.map(({ key, label, items, bg }) => (
        items.length > 0 || key === "expired" || key === "critical" ? (
          <div key={key} className={`rounded-2xl border px-5 py-4 ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">{label}</h2>
              <span className="text-xs text-warm-cream/50">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-warm-cream/40 py-2">None — great!</p>
            ) : (
              <div>
                {items.map((item) => (
                  <ItemRow key={`${item.entityId}-${item.field}`} item={item} />
                ))}
              </div>
            )}
          </div>
        ) : null
      ))}

      {/* OK section (collapsible feel — just show count + expandable) */}
      {summary.ok.length > 0 && (
        <details className={`rounded-2xl border px-5 py-4 ${sections[3].bg}`}>
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <h2 className="font-semibold text-sm">{sections[3].label}</h2>
            <span className="text-xs text-warm-cream/50">{summary.ok.length} items ▼</span>
          </summary>
          <div className="mt-3">
            {summary.ok.map((item) => (
              <ItemRow key={`${item.entityId}-${item.field}`} item={item} />
            ))}
          </div>
        </details>
      )}

      <p className="text-xs text-warm-cream/30 pt-2">
        Alerts at: expired = any past date · critical = &lt;30 days · warning = 30–90 days.
        Dutch legal requirements: APK annually, taxi vergunning per municipality.
      </p>
    </div>
  );
}
