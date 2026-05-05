"use client";

import Link from "next/link";
import { STAFF_ROLE_OPTIONS, PAYOUT_METHODS } from "@/lib/admin/staff-types";
import type { StaffRow } from "@/lib/admin/staff-types";

type Props = {
  action: (f: FormData) => Promise<void>;
  labels: Record<string, string>;
  defaults?: Partial<StaffRow>;
  staffId?: string;
};

function lbl(labels: Record<string, string>, key: string, fallback: string) {
  return labels[key] ?? fallback;
}

function field(
  name: string, label: string, type = "text",
  value?: string | null | number, required = false
) {
  const val = value === null || value === undefined ? "" : String(value);
  return (
    <div className="space-y-1.5" key={name}>
      <label htmlFor={name} className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea id={name} name={name} defaultValue={val} rows={3}
          className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40 resize-none" />
      ) : (
        <input id={name} name={name} type={type} defaultValue={val} required={required}
          className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
          style={type === "date" ? { colorScheme: "dark" } : undefined} />
      )}
    </div>
  );
}

export default function StaffForm({ action, labels, defaults = {}, staffId }: Props) {
  const d = defaults;

  return (
    <form action={action} className="space-y-8">
      {staffId && <input type="hidden" name="id" value={staffId} />}

      {/* Personal */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {lbl(labels, "admin.staff.section_personal", "Personal info")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("full_name",      lbl(labels, "admin.staff.field_full_name",      "Full name"),      "text", d.full_name, true)}
          {field("preferred_name", lbl(labels, "admin.staff.field_preferred_name", "Preferred name"), "text", d.preferred_name)}
          {field("phone",          lbl(labels, "admin.staff.field_phone",          "Phone"),          "tel",  d.phone)}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="role" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
            {lbl(labels, "admin.staff.field_role", "Role")}<span className="text-red-400 ml-0.5">*</span>
          </label>
          <select id="role" name="role" defaultValue={d.role ?? "driver_guide"}
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
            style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
            {STAFF_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value} style={{ backgroundColor: "#0D0D0D" }}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("spoken_languages",  lbl(labels, "admin.staff.field_languages",  "Languages (comma-sep)"), "text",   d.spoken_languages?.join(", "))}
          {field("max_tours_per_day", lbl(labels, "admin.staff.field_max_tours",  "Max tours/day"),         "number", d.max_tours_per_day ?? 3)}
        </div>
        {field("bio_short", lbl(labels, "admin.staff.field_bio_short", "Short bio"), "textarea", d.bio_short)}
      </section>

      {/* Emergency */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {lbl(labels, "admin.staff.section_emergency", "Emergency contact")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("emergency_contact_name",  lbl(labels, "admin.staff.field_ec_name",  "Name"),  "text", d.emergency_contact_name)}
          {field("emergency_contact_phone", lbl(labels, "admin.staff.field_ec_phone", "Phone"), "tel",  d.emergency_contact_phone)}
        </div>
      </section>

      {/* Compliance */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {lbl(labels, "admin.staff.section_compliance", "Compliance & documents")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("driving_license_number", lbl(labels, "admin.staff.field_dl_num",    "Driving license no."), "text", d.driving_license_number)}
          {field("driving_license_expiry", lbl(labels, "admin.staff.field_dl_expiry", "DL expiry"),          "date", d.driving_license_expiry)}
          {field("taxi_pas_number",        lbl(labels, "admin.staff.field_taxi_num",  "Taxi PAS no."),        "text", d.taxi_pas_number)}
          {field("taxi_pas_expiry",        lbl(labels, "admin.staff.field_taxi_exp",  "Taxi PAS expiry"),     "date", d.taxi_pas_expiry)}
          {field("first_aid_cert_expiry",  lbl(labels, "admin.staff.field_fa_expiry", "First-aid expiry"),    "date", d.first_aid_cert_expiry)}
          {field("background_check_date",  lbl(labels, "admin.staff.field_bg_date",   "BG check date"),       "date", d.background_check_date)}
          {field("background_check_expiry",lbl(labels, "admin.staff.field_bg_expiry", "BG check expiry"),     "date", d.background_check_expiry)}
          {field("hire_date",              lbl(labels, "admin.staff.field_hire_date", "Hire date"),            "date", d.hire_date)}
        </div>
      </section>

      {/* Pay */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {lbl(labels, "admin.staff.section_pay", "Pay & payout")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("hourly_rate_cents", lbl(labels, "admin.staff.field_hourly", "Hourly rate (cents)"), "number", d.hourly_rate_cents)}
          {field("daily_rate_cents",  lbl(labels, "admin.staff.field_daily",  "Daily rate (cents)"),  "number", d.daily_rate_cents)}
          {field("bank_iban",         lbl(labels, "admin.staff.field_iban",   "IBAN"),                "text",   d.bank_iban)}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="payout_method" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
            {lbl(labels, "admin.staff.field_payout_method", "Payout method")}
          </label>
          <select id="payout_method" name="payout_method" defaultValue={d.payout_method ?? "bank_transfer"}
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
            style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
            {PAYOUT_METHODS.map((m) => (
              <option key={m.value} value={m.value} style={{ backgroundColor: "#0D0D0D" }}>{m.label}</option>
            ))}
          </select>
        </div>
      </section>

      {field("notes", lbl(labels, "admin.staff.field_notes", "Internal notes"), "textarea", d.notes)}

      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
          {lbl(labels, "common.save_changes", "Save changes")}
        </button>
        <Link href="/admin/staff"
          className="px-6 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5 transition-colors">
          {lbl(labels, "common.cancel", "Cancel")}
        </Link>
      </div>
    </form>
  );
}
