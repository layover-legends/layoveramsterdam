import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffByUserId } from "@/lib/admin/staff";
import { getAssignmentById } from "@/lib/admin/assignments";
import { savePreflightChecklist } from "@/app/actions/driver";

export const dynamic = "force-dynamic";

const CHECKLIST_ITEMS = [
  { id: "vehicle_clean",      label: "Vehicle clean & interior wiped" },
  { id: "fuel_50",            label: "Fuel / charge >50%" },
  { id: "apk_valid",          label: "APK & insurance current" },
  { id: "first_aid_kit",      label: "First-aid kit, reflective vest & warning triangle present" },
  { id: "customer_reviewed",  label: "Customer info reviewed (name, language, dietary, allergies)" },
  { id: "phone_charged",      label: "Phone fully charged + car charger present" },
  { id: "water_bottles",      label: "Spare water bottles in vehicle" },
  { id: "cash_float",         label: "Cash float for tolls (€20)" },
  { id: "route_reviewed",     label: "Route reviewed for today's tour" },
  { id: "pickup_confirmed",   label: "Pickup time & location confirmed" },
];

type PageProps = { params: { id: string } };

export default async function PreflightPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const staff = await getStaffByUserId(user.id);
  if (!staff) redirect("/?error=driver_access_only");

  const a = await getAssignmentById(params.id);
  if (!a || a.staff_id !== staff.id) notFound();

  const existing = (a.preflight_checklist ?? {}) as Record<string, boolean>;
  const isDone   = !!(a.preflight_done_at);

  const saveAction = savePreflightChecklist.bind(null, a.id, staff.id);

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <header className="space-y-1">
        <a href={`/driver/tour/${a.id}`} className="text-xs text-warm-cream/40 hover:text-warm-cream/60">
          ← Tour detail
        </a>
        <h1 className="font-display text-2xl font-semibold">Pre-flight checklist</h1>
        {a.booking?.tour?.name && (
          <p className="text-sm text-warm-cream/60">{a.booking.tour.name}</p>
        )}
        {isDone && (
          <p className="text-xs text-emerald-400">✓ Completed</p>
        )}
      </header>

      <form action={saveAction} className="space-y-4">
        <div className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 divide-y divide-warm-cream/8">
          {CHECKLIST_ITEMS.map(({ id, label }) => (
            <label key={id}
              className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-warm-cream/5 transition-colors">
              <input
                type="checkbox"
                name={id}
                defaultChecked={!!(existing[id])}
                className="mt-0.5 w-5 h-5 rounded accent-legend-gold shrink-0"
              />
              <span className={`text-sm leading-relaxed ${existing[id] ? "text-warm-cream/60 line-through" : "text-warm-cream/85"}`}>
                {label}
              </span>
            </label>
          ))}
        </div>

        <button type="submit"
          className="w-full px-4 py-4 rounded-2xl bg-legend-gold text-ink-black font-bold text-base hover:bg-gold-light active:bg-gold-dark transition-colors">
          Save & mark pre-flight done ✓
        </button>
      </form>
    </div>
  );
}
