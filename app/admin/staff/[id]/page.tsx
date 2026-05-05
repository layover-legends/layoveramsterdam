import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getStaffById } from "@/lib/admin/staff";
import { upsertStaff, deactivateStaff } from "@/app/admin/staff/actions";
import { getUiStrings, t } from "@/lib/i18n/ui";
import StaffForm from "@/components/admin/StaffForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
};

function expiryBadge(dateStr: string | null) {
  if (!dateStr) return null;
  const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0)  return <span className="text-xs px-2 py-0.5 rounded border bg-red-500/20 text-red-300 border-red-500/30">EXPIRED</span>;
  if (days < 30) return <span className="text-xs px-2 py-0.5 rounded border bg-orange-400/20 text-orange-300 border-orange-400/30">{days}d left</span>;
  if (days < 90) return <span className="text-xs px-2 py-0.5 rounded border bg-amber-400/20 text-amber-200 border-amber-400/30">{days}d left</span>;
  return null;
}

export default async function EditStaffPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const [row, s] = await Promise.all([getStaffById(params.id), getUiStrings()]);
  if (!row) notFound();

  const saved  = searchParams?.saved === "1";
  const error  = searchParams?.error;

  const complianceItems = [
    { label: "Driving license", date: row.driving_license_expiry },
    { label: "Taxi PAS",        date: row.taxi_pas_expiry },
    { label: "First aid",       date: row.first_aid_cert_expiry },
    { label: "Background check",date: row.background_check_expiry },
  ];
  const hasAlerts = complianceItems.some((x) =>
    x.date && Math.floor((new Date(x.date).getTime() - Date.now()) / 86400000) < 90
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <Link href="/admin/staff" className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
          ← {t(s, "admin.staff.title", "Staff")}
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {row.preferred_name || row.full_name || t(s, "admin.staff.edit_heading", "Edit staff member")}
        </h1>
        <p className="text-xs text-warm-cream/50 capitalize">
          {row.role.replace(/_/g, " ")} · {row.is_active ? "Active" : "Inactive"}
        </p>
      </header>

      {saved && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.common.saved", "Saved.")}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {decodeURIComponent(error)}
        </div>
      )}

      {hasAlerts && (
        <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 px-5 py-4 space-y-2">
          <p className="text-xs font-semibold text-orange-300 uppercase tracking-wide">Compliance alerts</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {complianceItems.map(({ label, date }) => date ? (
              <span key={label} className="flex items-center gap-1.5 text-warm-cream/70">
                {label} {expiryBadge(date)}
              </span>
            ) : null)}
          </div>
        </div>
      )}

      <StaffForm action={upsertStaff} labels={s} defaults={row} staffId={row.id} />

      {row.is_active && (
        <div className="pt-8 border-t border-warm-cream/10">
          <h3 className="text-sm font-semibold text-warm-cream/60 mb-3">Danger zone</h3>
          <form action={deactivateStaff}>
            <input type="hidden" name="id" value={row.id} />
            <button type="submit"
              className="px-5 py-2 rounded-full border border-red-400/30 text-red-400/80 text-sm hover:bg-red-400/10 transition-colors">
              Deactivate staff member
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
