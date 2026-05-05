import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAssignmentsForDate } from "@/lib/admin/assignments";
import { getUiStrings, t } from "@/lib/i18n/ui";
import { markAssignmentStarted, markAssignmentCompleted, markAssignmentNoShow } from "@/app/admin/roster/actions";

export const dynamic = "force-dynamic";

// Amsterdam is UTC+1 (winter) / UTC+2 (summer). Use the server date relative to AMS.
function getAmsterdamDate(offsetDays = 0): string {
  const now = new Date();
  now.setHours(now.getHours() + 2); // Approximate AMS offset; good enough for date
  now.setDate(now.getDate() + offsetDays);
  return now.toISOString().slice(0, 10);
}

type PageProps = {
  searchParams?: { date?: string };
};

const CANCELLATION_REASONS = [
  "customer_changed_mind", "customer_flight_cancelled", "customer_flight_delayed",
  "customer_emergency", "operator_overbooked", "operator_vehicle_breakdown",
  "operator_staff_sick", "operator_weather", "other",
];

function formatTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("nl-NL", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
  });
}

function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

export default async function AdminRosterPage({ searchParams }: PageProps) {
  await requireAdmin();

  const today = getAmsterdamDate(0);
  const selectedDate = searchParams?.date ?? today;

  // Build tabs: today + next 7 days
  const dates = Array.from({ length: 8 }, (_, i) => {
    const d = getAmsterdamDate(i);
    return {
      date: d,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(d).toLocaleDateString("en-NL", { weekday: "short", day: "numeric", month: "short" }),
      isToday: i === 0,
    };
  });

  const [assignments, s] = await Promise.all([
    listAssignmentsForDate(selectedDate),
    getUiStrings(),
  ]);

  const selectedLabel = dates.find((d) => d.date === selectedDate)?.label
    ?? new Date(selectedDate).toLocaleDateString("en-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {t(s, "admin.roster.title", "Roster")}
          </h1>
          <p className="text-sm text-warm-cream/60">{selectedLabel} · {assignments.length} tour{assignments.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/admin/roster/assign"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
          + Assign staff
        </Link>
      </header>

      {/* Date tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map(({ date, label, isToday }) => (
          <Link key={date} href={`/admin/roster?date=${date}`}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-xs transition-colors ${
              selectedDate === date
                ? "bg-legend-gold/15 border-legend-gold/40 text-legend-gold"
                : "border-warm-cream/15 text-warm-cream/60 hover:bg-warm-cream/5"
            }`}>
            {isToday ? "Today" : label}
          </Link>
        ))}
      </div>

      {/* Print link */}
      <div className="text-right">
        <a href={`/admin/roster?date=${selectedDate}&print=1`} target="_blank"
          className="text-xs text-warm-cream/40 hover:text-warm-cream/60 transition-colors">
          ⎙ Print roster
        </a>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
          No tours assigned for {selectedLabel}.
          {selectedDate === today && (
            <p className="mt-2 text-sm">
              <Link href="/admin/bookings" className="text-legend-gold hover:text-gold-light">
                View confirmed bookings →
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const bk      = a.booking;
            const tour    = bk?.tour;
            const user    = bk?.user;
            const staff   = a.staff;
            const vehicle = a.vehicle;
            const isDone  = !!(a.completed_at);
            const isStarted = !!(a.started_at);
            const isNoShow  = !!(a.no_show_at);

            // Fatigue check (simple: if staff has other assignments today)
            const staffTourCount = assignments.filter((x) => x.staff_id === a.staff_id).length;
            const fatigueWarn    = staff && staffTourCount > 1 &&
              assignments.indexOf(a) === assignments.findLastIndex((x) => x.staff_id === a.staff_id);

            const statusBadge = isDone   ? { label: "Completed", css: "bg-emerald-400/15 text-emerald-200" }
                              : isNoShow ? { label: "No-show",   css: "bg-red-400/15 text-red-200" }
                              : isStarted? { label: "In progress","css": "bg-canal-blue/30 text-canal-light" }
                              :            { label: "Scheduled",  css: "bg-warm-cream/10 text-warm-cream/50" };

            return (
              <div key={a.id}
                className={`rounded-2xl border p-5 space-y-4 ${
                  isDone   ? "border-emerald-400/15 bg-emerald-400/5 opacity-75" :
                  isNoShow ? "border-red-400/15 bg-red-400/5 opacity-75" :
                  isStarted? "border-canal-blue/30 bg-canal-blue/5" :
                             "border-warm-cream/10 bg-warm-cream/3"
                }`}>

                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-lg font-semibold">
                        {formatTime(a.pickup_at)}
                      </span>
                      <span className="text-warm-cream/60">·</span>
                      <span className="font-semibold text-warm-cream/90">
                        {tour?.name ?? "Unlinked tour"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.css}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    {bk && (
                      <div className="text-sm text-warm-cream/60">
                        {bk.party_size} pax · {formatMoney(bk.total_cents, bk.currency)}
                        {user?.is_vip && <span className="ml-2 text-xs text-legend-gold">★ VIP</span>}
                        {(user?.lifetime_bookings_count ?? 0) > 1 && (
                          <span className="ml-2 text-xs text-canal-light">#{user?.lifetime_bookings_count} booking</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-warm-cream/50 space-y-0.5">
                    {staff && <div>👤 {staff.preferred_name || staff.full_name}</div>}
                    {vehicle && <div>🚙 {vehicle.nickname}{vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}</div>}
                  </div>
                </div>

                {/* Customer notes */}
                {(user?.dietary_notes || user?.accessibility_notes || user?.internal_notes) && (
                  <div className="rounded-xl bg-amber-400/8 border border-amber-400/20 px-4 py-3 text-xs space-y-1">
                    {user.dietary_notes && (
                      <div><span className="text-amber-300 font-medium">🍽 Dietary: </span><span className="text-warm-cream/75">{user.dietary_notes}</span></div>
                    )}
                    {user.accessibility_notes && (
                      <div><span className="text-amber-300 font-medium">♿ Accessibility: </span><span className="text-warm-cream/75">{user.accessibility_notes}</span></div>
                    )}
                    {user.internal_notes && (
                      <div><span className="text-amber-300 font-medium">📝 Notes: </span><span className="text-warm-cream/75">{user.internal_notes}</span></div>
                    )}
                  </div>
                )}

                {/* Fatigue warning */}
                {fatigueWarn && (
                  <div className="rounded-xl bg-orange-400/10 border border-orange-400/20 px-4 py-2 text-xs text-orange-300">
                    ⚠ {staff?.preferred_name || staff?.full_name} has {staffTourCount} tours today
                  </div>
                )}

                {/* Preflight status */}
                {a.preflight_done_at && (
                  <div className="text-xs text-emerald-400/70">
                    ✓ Pre-flight done {formatTime(a.preflight_done_at)}
                  </div>
                )}

                {/* Action buttons */}
                {!isDone && !isNoShow && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!isStarted ? (
                      <form action={markAssignmentStarted}>
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <button type="submit"
                          className="px-4 py-1.5 rounded-full bg-legend-gold text-ink-black font-medium text-xs hover:bg-gold-light transition-colors">
                          Mark started
                        </button>
                      </form>
                    ) : (
                      <form action={markAssignmentCompleted} className="flex gap-2 items-center">
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <input name="odometer_end" type="number" placeholder="Odometer end km"
                          className="w-32 px-2 py-1 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs" />
                        <input name="fuel_cost_cents" type="number" placeholder="Fuel (cents)"
                          className="w-28 px-2 py-1 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs" />
                        <button type="submit"
                          className="px-4 py-1.5 rounded-full bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-500 transition-colors">
                          Mark completed
                        </button>
                      </form>
                    )}

                    <form action={markAssignmentNoShow} className="flex gap-2 items-center">
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <select name="reason"
                        className="px-2 py-1 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs"
                        style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
                        {CANCELLATION_REASONS.map((r) => (
                          <option key={r} value={r} style={{ backgroundColor: "#0D0D0D" }}>
                            {r.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <button type="submit"
                        className="px-4 py-1.5 rounded-full border border-warm-cream/20 text-warm-cream/70 font-medium text-xs hover:bg-warm-cream/5 transition-colors">
                        No-show
                      </button>
                    </form>

                    {bk && (
                      <Link href={`/admin/bookings/${bk.id}`}
                        className="px-4 py-1.5 rounded-full border border-warm-cream/15 text-warm-cream/50 font-medium text-xs hover:bg-warm-cream/5 transition-colors">
                        Booking →
                      </Link>
                    )}
                  </div>
                )}

                {/* Completion summary */}
                {isDone && (
                  <div className="text-xs text-warm-cream/50 flex flex-wrap gap-4">
                    <span>Completed {formatTime(a.completed_at)}</span>
                    {a.odometer_start && a.odometer_end && (
                      <span>{(a.odometer_end - a.odometer_start).toLocaleString()} km driven</span>
                    )}
                    {a.fuel_cost_cents && (
                      <span>Fuel: {formatMoney(a.fuel_cost_cents)}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
