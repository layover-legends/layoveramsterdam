"use client";
// Server-compatible form — no client hooks needed, but marked client for safety

import Link from "next/link";
import { VEHICLE_TYPE_OPTIONS, FUEL_TYPE_OPTIONS } from "@/lib/admin/vehicles-types";
import type { VehicleRow } from "@/lib/admin/vehicles-types";

type Props = {
  action: (f: FormData) => Promise<void>;
  labels: Record<string, string>;
  defaults?: Partial<VehicleRow>;
  vehicleId?: string;
};

function lbl(labels: Record<string, string>, key: string, fallback: string) {
  return labels[key] ?? fallback;
}

function field(
  name: string, label: string, type = "text",
  value?: string | null | number | boolean, required = false
) {
  const val = value === null || value === undefined ? "" : String(value);
  return (
    <div className="space-y-1.5" key={name}>
      <label htmlFor={name} className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea id={name} name={name} defaultValue={val} rows={2}
          className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40 resize-none" />
      ) : (
        <input id={name} name={name} type={type} defaultValue={val} required={required}
          className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
          style={type === "date" ? { colorScheme: "dark" } : undefined} />
      )}
    </div>
  );
}

export default function VehicleForm({ action, labels, defaults = {}, vehicleId }: Props) {
  const d = defaults;

  return (
    <form action={action} className="space-y-8">
      {vehicleId && <input type="hidden" name="id" value={vehicleId} />}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {lbl(labels, "admin.vehicles.section_identity", "Vehicle identity")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("nickname",      lbl(labels, "admin.vehicles.field_nickname", "Nickname"),      "text",   d.nickname, true)}
          {field("license_plate", lbl(labels, "admin.vehicles.field_plate",    "License plate"), "text",   d.license_plate)}
          {field("make",          lbl(labels, "admin.vehicles.field_make",     "Make"),          "text",   d.make)}
          {field("model",         lbl(labels, "admin.vehicles.field_model",    "Model"),         "text",   d.model)}
          {field("year",          lbl(labels, "admin.vehicles.field_year",     "Year"),          "number", d.year)}
          {field("color",         lbl(labels, "admin.vehicles.field_color",    "Color"),         "text",   d.color)}
          {field("vin",           lbl(labels, "admin.vehicles.field_vin",      "VIN"),           "text",   d.vin)}
          {field("seats",         lbl(labels, "admin.vehicles.field_seats",    "Seats"),         "number", d.seats)}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="vehicle_type" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
            {lbl(labels, "admin.vehicles.field_type", "Type")}<span className="text-red-400 ml-0.5">*</span>
          </label>
          <select id="vehicle_type" name="vehicle_type" defaultValue={d.vehicle_type ?? "van"}
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
            style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
            {VEHICLE_TYPE_OPTIONS.map((v) => (
              <option key={v.value} value={v.value} style={{ backgroundColor: "#0D0D0D" }}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="fuel_type" className="block text-xs font-medium text-warm-cream/70 uppercase tracking-wide">
            {lbl(labels, "admin.vehicles.field_fuel", "Fuel type")}
          </label>
          <select id="fuel_type" name="fuel_type" defaultValue={d.fuel_type ?? "petrol"}
            className="w-full px-3 py-2 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-sm focus:outline-none focus:ring-2 focus:ring-legend-gold/40"
            style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
            {FUEL_TYPE_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ backgroundColor: "#0D0D0D" }}>{f.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="wheelchair_accessible" defaultChecked={!!(d.wheelchair_accessible)}
            className="w-4 h-4 rounded accent-legend-gold" />
          <span className="text-sm text-warm-cream/70">
            {lbl(labels, "admin.vehicles.field_wheelchair", "Wheelchair accessible")}
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {lbl(labels, "admin.vehicles.section_compliance", "Compliance")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("apk_expiry",              lbl(labels, "admin.vehicles.field_apk",        "APK expiry"),        "date", d.apk_expiry)}
          {field("insurance_expiry",        lbl(labels, "admin.vehicles.field_ins",        "Insurance expiry"),  "date", d.insurance_expiry)}
          {field("road_tax_expiry",         lbl(labels, "admin.vehicles.field_road_tax",   "Road tax expiry"),   "date", d.road_tax_expiry)}
          {field("insurance_policy_number", lbl(labels, "admin.vehicles.field_ins_policy", "Policy no."),        "text", d.insurance_policy_number)}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-legend-gold uppercase tracking-wide">
          {lbl(labels, "admin.vehicles.section_service", "Odometer & service")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("odometer_km",          lbl(labels, "admin.vehicles.field_odometer",     "Odometer (km)"),         "number", d.odometer_km)}
          {field("last_service_date",    lbl(labels, "admin.vehicles.field_last_svc_date","Last service date"),     "date",   d.last_service_date)}
          {field("last_service_km",      lbl(labels, "admin.vehicles.field_last_svc_km",  "Last service km"),       "number", d.last_service_km)}
          {field("service_interval_km",  lbl(labels, "admin.vehicles.field_interval",     "Service interval (km)"), "number", d.service_interval_km ?? 15000)}
          {field("fuel_card_number",     lbl(labels, "admin.vehicles.field_fuel_card",    "Fuel card no."),         "text",   d.fuel_card_number)}
        </div>
      </section>

      {field("notes", lbl(labels, "admin.vehicles.field_notes", "Notes"), "textarea", d.notes)}

      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors">
          {lbl(labels, "common.save_changes", "Save changes")}
        </button>
        <Link href="/admin/vehicles"
          className="px-6 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/70 text-sm hover:bg-warm-cream/5 transition-colors">
          {lbl(labels, "common.cancel", "Cancel")}
        </Link>
      </div>
    </form>
  );
}
