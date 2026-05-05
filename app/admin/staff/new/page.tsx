import { requireAdmin } from "@/lib/auth/require-admin";
import { getUiStrings, t } from "@/lib/i18n/ui";
import Link from "next/link";
import StaffForm from "@/components/admin/StaffForm";
import { upsertStaff } from "@/app/admin/staff/actions";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  await requireAdmin();
  const s = await getUiStrings();

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <Link href="/admin/staff" className="text-xs text-warm-cream/50 hover:text-warm-cream/80 transition-colors">
          ← {t(s, "admin.staff.title", "Staff")}
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          {t(s, "admin.staff.new_heading", "Add staff member")}
        </h1>
        <p className="text-sm text-warm-cream/60">
          {t(s, "admin.staff.new_hint", "Add yourself first to validate the flow before adding drivers.")}
        </p>
      </header>
      <StaffForm action={upsertStaff} labels={s} />
    </div>
  );
}
