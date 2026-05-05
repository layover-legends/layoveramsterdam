import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffByUserId } from "@/lib/admin/staff";
import { listAssignmentsForStaff } from "@/lib/admin/assignments";
import type { AssignmentWithDetails } from "@/lib/admin/assignments";

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

function AssignmentPreviewCard({ a }: { a: AssignmentWithDetails }) {
  const bk   = a.booking;
  const tour = bk?.tour;
  const user = bk?.user;
  const veh  = a.vehicle;

  return (
    <article className="rounded-2xl border border-warm-cream/10 bg-warm-cream/3 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold text-legend-gold/80">
            {formatTime(a.pickup_at)}
          </p>
          <p className="font-semibold text-warm-cream/80 text-lg mt-0.5">
            {tour?.name ?? "Tour"}
          </p>
          {bk && (
            <p className="text-sm text-warm-cream/50 mt-0.5">
              {bk.party_size} pax · {formatMoney(bk.total_cents, bk.currency)}
              {user?.is_vip && <span className="ml-2 text-xs text-legend-gold/70">★ VIP</span>}
            </p>
          )}
        </div>
        <span className="text-xs bg-warm-cream/8 text-warm-cream/50 px-2 py-1 rounded-full shrink-0">
          Tomorrow
        </span>
      </div>

      {(bk?.customer_name || user?.full_name) && (
        <p className="text-sm text-warm-cream/60">
          {bk?.customer_name || user?.full_name}
          {user?.phone && (
            <a href={`tel:${user.phone}`} className="ml-3 text-xs text-legend-gold/60">
              📞 {user.phone}
            </a>
          )}
        </p>
      )}

      {veh && (
        <p className="text-sm text-warm-cream/50">
          🚙 {veh.nickname}{veh.license_plate ? ` · ${veh.license_plate}` : ""}
        </p>
      )}

      {user?.dietary_notes && (
        <p className="text-xs text-amber-300/70">🍽 {user.dietary_notes}</p>
      )}
      {user?.accessibility_notes && (
        <p className="text-xs text-amber-300/70">♿ {user.accessibility_notes}</p>
      )}
    </article>
  );
}

export default async function DriverTomorrowPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?auth_required=1");

  const staff = await getStaffByUserId(user.id);
  if (!staff) redirect("/?error=driver_access_only");

  // Tomorrow in Amsterdam time
  const now = new Date();
  now.setHours(now.getHours() + 2); // rough AMS offset
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  void todayStr; // used for date comparison if needed

  const assignments = await listAssignmentsForStaff(staff.id, tomorrow);

  const dateLabel = new Date(tomorrow).toLocaleDateString("en-NL", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <header>
        <p className="text-xs text-warm-cream/40 uppercase tracking-wide">{dateLabel}</p>
        <h1 className="font-display text-2xl font-semibold text-warm-cream">
          {assignments.length === 0
            ? "Nothing scheduled yet"
            : `${assignments.length} tour${assignments.length > 1 ? "s" : ""} tomorrow`}
        </h1>
        <p className="text-xs text-warm-cream/30 mt-1">
          Read-only preview — actions are available on the day
        </p>
      </header>

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-warm-cream/10 px-6 py-12 text-center text-warm-cream/40">
          <p className="text-4xl mb-3">🌅</p>
          <p>No tours assigned for tomorrow.</p>
          <p className="text-sm mt-1">Check back later or contact your manager.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <AssignmentPreviewCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
