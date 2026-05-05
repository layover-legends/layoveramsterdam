import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffByUserId } from "@/lib/admin/staff";
import { getAssignmentById } from "@/lib/admin/assignments";
import { markTourStarted, markTourCompleted } from "@/app/actions/driver";

export const dynamic = "force-dynamic";

function formatTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("nl-NL", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
  });
}

function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

type PageProps = { params: { id: string } };

export default async function DriverTourPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const staff = await getStaffByUserId(user.id);
  if (!staff) redirect("/?error=driver_access_only");

  const a = await getAssignmentById(params.id);
  if (!a || a.staff_id !== staff.id) notFound();

  const bk    = a.booking;
  const tour  = bk?.tour;
  const user_ = bk?.user;
  const veh   = a.vehicle;

  const isDone    = !!(a.completed_at);
  const isStarted = !!(a.started_at);
  const needsPreflight = !a.preflight_done_at;

  const startAction  = markTourStarted.bind(null, a.id, staff.id);
  const doneAction   = markTourCompleted.bind(null, a.id, staff.id);

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <header className="space-y-1">
        <a href="/driver/today" className="text-xs text-warm-cream/40 hover:text-warm-cream/60">← Today</a>
        <h1 className="font-display text-2xl font-semibold">{tour?.name ?? "Tour detail"}</h1>
        <p className="text-sm text-warm-cream/60">
          {formatTime(a.pickup_at)}
          {bk && ` · ${bk.party_size} pax · ${formatMoney(bk.total_cents, bk.currency)}`}
        </p>
      </header>

      {/* Status */}
      {isDone && (
        <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/20 px-4 py-3 text-sm text-emerald-200">
          ✓ Completed at {formatTime(a.completed_at)}
        </div>
      )}

      {/* Customer */}
      {(user_ || bk?.customer_name) && (
        <section className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-warm-cream/50">Customer</h2>
          <div className="space-y-2">
            <p className="font-medium text-warm-cream/90">
              {bk?.customer_name || user_?.full_name || "Guest"}
            </p>
            {user_?.phone && (
              <a href={`tel:${user_?.phone}`} className="flex items-center gap-2 text-sm text-legend-gold">
                <span>📞</span> {user_?.phone}
              </a>
            )}
            {user_?.is_vip && <p className="text-xs text-legend-gold">★ VIP customer</p>}
            {(user_?.lifetime_bookings_count ?? 0) > 1 && (
              <p className="text-xs text-canal-light">Booking #{user_?.lifetime_bookings_count}</p>
            )}
            {user_?.dietary_notes && <p className="text-sm text-amber-300">🍽 {user_?.dietary_notes}</p>}
            {user_?.accessibility_notes && <p className="text-sm text-amber-300">♿ {user_?.accessibility_notes}</p>}
            {user_?.internal_notes && <p className="text-sm text-warm-cream/50 italic">"{user_?.internal_notes}"</p>}
          </div>
        </section>
      )}

      {/* Vehicle */}
      {veh && (
        <section className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-warm-cream/50">Vehicle</h2>
          <p className="font-medium text-warm-cream/90">{veh.nickname}</p>
          {veh.license_plate && <p className="font-mono text-sm text-warm-cream/60">{veh.license_plate}</p>}
        </section>
      )}

      {/* Pre-flight */}
      <section className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wide text-warm-cream/50">Pre-flight</h2>
          {a.preflight_done_at
            ? <span className="text-xs text-emerald-400">✓ Done {formatTime(a.preflight_done_at)}</span>
            : <span className="text-xs text-orange-300">⚠ Required before start</span>}
        </div>
        {!a.preflight_done_at && (
          <a href={`/driver/preflight/${a.id}`}
            className="block w-full text-center px-4 py-3 rounded-xl bg-warm-cream/10 text-warm-cream font-medium text-sm hover:bg-warm-cream/15 transition-colors">
            Open checklist →
          </a>
        )}
      </section>

      {/* Actions */}
      {!isDone && (
        <section className="space-y-3">
          {!isStarted && (
            <form action={startAction}>
              <button type="submit" disabled={needsPreflight}
                className={`w-full px-4 py-4 rounded-2xl font-bold text-lg transition-colors ${
                  needsPreflight
                    ? "bg-warm-cream/10 text-warm-cream/30 cursor-not-allowed"
                    : "bg-legend-gold text-ink-black hover:bg-gold-light active:bg-gold-dark"
                }`}>
                {needsPreflight ? "Complete pre-flight first" : "Start tour →"}
              </button>
            </form>
          )}

          {isStarted && (
            <form action={doneAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-warm-cream/50 uppercase tracking-wide">Odometer (km)</label>
                  <input name="odometer_end" type="number" placeholder="e.g. 12543"
                    className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-warm-cream/50 uppercase tracking-wide">Fuel cost (€)</label>
                  <input name="fuel_cost_euros" type="number" step="0.01" placeholder="e.g. 12.50"
                    className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm" />
                </div>
              </div>
              <button type="submit"
                className="w-full px-4 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-500 active:bg-emerald-700 transition-colors">
                Complete tour ✓
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
