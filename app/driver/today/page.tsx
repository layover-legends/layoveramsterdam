import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffByUserId } from "@/lib/admin/staff";
import { listAssignmentsForStaff } from "@/lib/admin/assignments";
import type { AssignmentWithDetails } from "@/lib/admin/assignments";
import InstallPrompt from "@/components/driver/InstallPrompt";
import SOSButton from "@/components/driver/SOSButton";

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

function mapsUrl(location: string): string {
  const encoded = encodeURIComponent(location);
  // Deep link: Apple Maps on iOS, Google Maps on Android/desktop
  return `https://maps.google.com/?q=${encoded}`;
}

function AssignmentCard({ a }: { a: AssignmentWithDetails }) {
  const bk    = a.booking;
  const tour  = bk?.tour;
  const user  = bk?.user;
  const veh   = a.vehicle;

  const isDone    = !!(a.completed_at);
  const isStarted = !!(a.started_at);
  const isNoShow  = !!(a.no_show_at);
  const needsPreflight = !a.preflight_done_at;

  const statusColor = isDone    ? "border-emerald-400/20 bg-emerald-400/5"
                    : isNoShow  ? "border-red-400/20 bg-red-400/5 opacity-60"
                    : isStarted ? "border-legend-gold/30 bg-legend-gold/5"
                    :             "border-warm-cream/15 bg-warm-cream/3";

  return (
    <article className={`rounded-2xl border p-5 space-y-4 ${statusColor}`}>
      {/* Time + tour */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold text-legend-gold">
            {formatTime(a.pickup_at)}
          </p>
          <p className="font-semibold text-warm-cream/90 text-lg mt-0.5">
            {tour?.name ?? "Tour"}
          </p>
          {bk && (
            <p className="text-sm text-warm-cream/60 mt-0.5">
              {bk.party_size} pax · {formatMoney(bk.total_cents, bk.currency)}
              {user?.is_vip && <span className="ml-2 text-xs text-legend-gold">★ VIP</span>}
            </p>
          )}
        </div>
        {isDone   && <span className="text-xs bg-emerald-400/15 text-emerald-200 px-2 py-1 rounded-full">Done</span>}
        {isStarted && !isDone && <span className="text-xs bg-legend-gold/15 text-legend-gold px-2 py-1 rounded-full">In progress</span>}
        {isNoShow  && <span className="text-xs bg-red-400/15 text-red-200 px-2 py-1 rounded-full">No-show</span>}
      </div>

      {/* Customer info */}
      {(bk?.customer_name || user?.full_name) && (
        <div className="rounded-xl bg-warm-cream/5 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-warm-cream/90">
            {bk?.customer_name || user?.full_name || "Customer"}
            {user?.phone && (
              <a href={`tel:${user.phone}`}
                className="ml-3 text-xs text-legend-gold hover:text-gold-light">
                📞 {user.phone}
              </a>
            )}
          </p>
          {user?.dietary_notes && (
            <p className="text-xs text-amber-300">🍽 {user.dietary_notes}</p>
          )}
          {user?.accessibility_notes && (
            <p className="text-xs text-amber-300">♿ {user.accessibility_notes}</p>
          )}
          {user?.internal_notes && (
            <p className="text-xs text-warm-cream/50">📝 {user.internal_notes}</p>
          )}
        </div>
      )}

      {/* Vehicle + pickup */}
      <div className="flex flex-wrap gap-3 text-sm text-warm-cream/70">
        {veh && (
          <span>🚙 {veh.nickname}{veh.license_plate ? ` · ${veh.license_plate}` : ""}</span>
        )}
        {a.pickup_at && (
          <a
            href={mapsUrl("Amsterdam Schiphol Airport arrivals")}
            target="_blank" rel="noopener noreferrer"
            className="text-canal-light hover:text-canal-blue transition-colors">
            📍 Open in Maps →
          </a>
        )}
      </div>

      {/* Action buttons */}
      {!isDone && !isNoShow && (
        <div className="flex flex-wrap gap-3 pt-1">
          {needsPreflight && !isStarted && (
            <a href={`/driver/preflight/${a.id}`}
              className="flex-1 text-center px-4 py-3 rounded-2xl bg-warm-cream/10 text-warm-cream font-medium text-sm hover:bg-warm-cream/15 transition-colors">
              ☑ Pre-flight checklist
            </a>
          )}
          {!isStarted ? (
            <a href={`/driver/tour/${a.id}`}
              className={`flex-1 text-center px-4 py-3 rounded-2xl font-semibold text-sm transition-colors ${
                needsPreflight
                  ? "bg-warm-cream/10 text-warm-cream/50 cursor-not-allowed"
                  : "bg-legend-gold text-ink-black hover:bg-gold-light"
              }`}>
              Start tour →
            </a>
          ) : (
            <a href={`/driver/tour/${a.id}`}
              className="flex-1 text-center px-4 py-3 rounded-2xl bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
              Complete tour →
            </a>
          )}
        </div>
      )}

      {isDone && (
        <p className="text-xs text-emerald-400/60">
          ✓ Completed at {formatTime(a.completed_at)}
          {a.odometer_end && a.odometer_start && ` · ${a.odometer_end - a.odometer_start}km`}
        </p>
      )}
    </article>
  );
}

export default async function DriverTodayPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const staff = await getStaffByUserId(user.id);
  if (!staff) redirect("/?error=driver_access_only");

  const now = new Date();
  now.setHours(now.getHours() + 2);
  const today = now.toISOString().slice(0, 10);

  const assignments = await listAssignmentsForStaff(staff.id, today);

  const dateLabel = new Date(today).toLocaleDateString("en-NL", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <header>
        <p className="text-xs text-warm-cream/40 uppercase tracking-wide">{dateLabel}</p>
        <h1 className="font-display text-2xl font-semibold text-warm-cream">
          {assignments.length === 0
            ? "No tours today"
            : `${assignments.length} tour${assignments.length > 1 ? "s" : ""} today`}
        </h1>
      </header>

      {/* Install prompt (shown after 2nd visit) */}
      <InstallPrompt />

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
          <p className="text-4xl mb-3">😴</p>
          <p>No tours assigned for today.</p>
          <p className="text-sm mt-1">Check back tomorrow or contact your manager.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} a={a} />
          ))}
        </div>
      )}

      {/* SOS button — fixed, always visible */}
      <SOSButton staffName={staff.preferred_name || staff.full_name} />
    </div>
  );
}
