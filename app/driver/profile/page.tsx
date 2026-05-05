import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffByUserId } from "@/lib/admin/staff";

export const dynamic = "force-dynamic";

export default async function DriverProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const staff = await getStaffByUserId(user.id);
  if (!staff) redirect("/?error=driver_access_only");

  const complianceFields = [
    { label: "Driving license", date: staff.driving_license_expiry },
    { label: "Taxi PAS",        date: staff.taxi_pas_expiry },
    { label: "First aid",       date: staff.first_aid_cert_expiry },
    { label: "Background check",date: staff.background_check_expiry },
  ].filter((f) => f.date);

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <header>
        <h1 className="font-display text-2xl font-semibold">
          {staff.preferred_name || staff.full_name}
        </h1>
        <p className="text-sm text-warm-cream/50 capitalize mt-0.5">{staff.role.replace(/_/g, " ")}</p>
      </header>

      {complianceFields.length > 0 && (
        <section className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-warm-cream/50">My documents</h2>
          {complianceFields.map(({ label, date }) => {
            const days = Math.floor((new Date(date!).getTime() - Date.now()) / 86400000);
            const css  = days < 0 ? "text-red-300" : days < 30 ? "text-orange-300" : days < 90 ? "text-amber-200" : "text-emerald-400/60";
            return (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-warm-cream/70">{label}</span>
                <span className={css}>
                  {days < 0 ? "Expired" : `${days}d left`}
                  <span className="text-warm-cream/30 ml-1 text-xs">
                    ({new Date(date!).toLocaleDateString("nl-NL")})
                  </span>
                </span>
              </div>
            );
          })}
        </section>
      )}

      <section className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-warm-cream/50">Contact</h2>
        {staff.phone && <p className="text-sm text-warm-cream/70">📞 {staff.phone}</p>}
        <p className="text-sm text-warm-cream/70">📧 {user.email}</p>
      </section>

      <form action="/auth/signout" method="post">
        <button type="submit"
          className="w-full px-4 py-3 rounded-2xl border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5 transition-colors">
          Sign out
        </button>
      </form>
    </div>
  );
}
