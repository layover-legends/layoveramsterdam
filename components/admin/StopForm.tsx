"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Category, Stop } from "@/lib/admin/stops-types";

type StopType = "free" | "paid" | "after_dark";

function deriveType(stop?: Stop | null): StopType {
  if (stop?.is_adult_only) return "after_dark";
  if (stop?.requires_booking) return "paid";
  return "free";
}

function StopTypeRadio({ defaultValue, labels }: { defaultValue: StopType; labels?: Record<string, string> }) {
  const [type, setType] = useState<StopType>(defaultValue);

  const requiresBooking = type === "paid";
  const isAdultOnly = type === "after_dark";

  const opts: Array<{ value: StopType; emoji: string; title: string; hint: string }> = [
    { value: "free",       emoji: "🆓", title: lbl(labels, "admin.stopForm.type_free_title", "Free"),       hint: lbl(labels, "admin.stopForm.type_free_hint", "Open to everyone, no booking required.") },
    { value: "paid",       emoji: "€",  title: lbl(labels, "admin.stopForm.type_paid_title", "Paid"),       hint: lbl(labels, "admin.stopForm.type_paid_hint", "Bookable / paid entry. Shows in the paid catalog.") },
    { value: "after_dark", emoji: "🌙", title: lbl(labels, "admin.stopForm.type_after_dark_title", "After dark"), hint: lbl(labels, "admin.stopForm.type_after_dark_hint", "18+. Shows in the after-dark catalog only.") },
  ];

  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>{lbl(labels, "admin.stopForm.type_legend", "Stop type — pick one")}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {opts.map((o) => {
          const active = type === o.value;
          return (
            <label
              key={o.value}
              className={
                "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border " +
                (active
                  ? "bg-brand-orange/15 border-brand-orange/60 ring-1 ring-brand-orange/40"
                  : "bg-brand-cream/5 border-brand-cream/10 hover:bg-brand-cream/[0.07]")
              }
            >
              <input
                type="radio"
                name="stop_type_radio"
                value={o.value}
                checked={active}
                onChange={() => setType(o.value)}
                className="mt-0.5 h-4 w-4 text-brand-orange focus:ring-brand-orange/60"
              />
              <span className="text-sm text-brand-cream/85">
                <span className="font-medium text-brand-cream">
                  {o.emoji} {o.title}
                </span>
                <span className="block text-xs text-brand-cream/55 mt-0.5">{o.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      {/* Hidden inputs are what the server action actually reads. */}
      <input type="hidden" name="requires_booking" value={requiresBooking ? "on" : ""} />
      <input type="hidden" name="is_adult_only"    value={isAdultOnly    ? "on" : ""} />
    </fieldset>
  );
}

type Props = {
  stop?: Stop | null;
  categories: Category[];
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  deleteAction?: (formData: FormData) => void | Promise<void>;
  labels?: Record<string, string>;
};

function lbl(labels: Record<string, string> | undefined, key: string, fallback: string): string {
  return labels?.[key] ?? fallback;
}

const labelClass =
  "block text-xs uppercase tracking-wide text-brand-cream/60 mb-1";
const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60";

function SaveButton({ mode, labels }: { mode: "create" | "edit"; labels?: Record<string, string> }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
      {pending
        ? lbl(labels, "admin.stopForm.saving", "Saving…")
        : mode === "create"
        ? lbl(labels, "admin.stopForm.create", "Create stop")
        : lbl(labels, "admin.stopForm.save", "Save changes")}
    </button>
  );
}

function DeleteButton({
  formAction, labels,
}: {
  formAction: (formData: FormData) => void | Promise<void>;
  labels?: Record<string, string>;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending}
      onClick={(e) => {
        if (!confirm(lbl(labels, "admin.stopForm.confirm_delete", "Delete this stop permanently? Photos will be removed too."))) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-red-400/40 text-red-200 hover:bg-red-400/10 transition-colors disabled:opacity-60">
      {lbl(labels, "admin.stopForm.delete", "Delete")}
    </button>
  );
}

function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl bg-brand-cream/5 border border-brand-cream/10 cursor-pointer hover:bg-brand-cream/[0.07] transition-colors">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-brand-cream/40 bg-brand-cream/10 text-brand-orange focus:ring-brand-orange/60"
      />
      <span className="text-sm text-brand-cream/85">
        <span className="font-medium text-brand-cream">{label}</span>
        {hint && <span className="block text-xs text-brand-cream/55 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

function SeoFields({
  initialTitle,
  initialDescription,
  previewSlug,
  previewName,
  labels,
}: {
  initialTitle: string | null;
  initialDescription: string | null;
  previewSlug: string;
  previewName: string;
  labels?: Record<string, string>;
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [desc, setDesc] = useState(initialDescription ?? "");
  const displayTitle = title || `${previewName} · LayoverAmsterdam`;
  const displayDesc = desc || lbl(labels, "admin.stopForm.seo_hint", "Leave blank to use the description automatically.");
  return (
    <fieldset className="space-y-4">
      <legend className={labelClass + " mb-2"}>{lbl(labels, "admin.stopForm.seo_legend", "Search engine snippet")}</legend>
      <p className="text-xs text-brand-cream/45 -mt-2">
        {lbl(labels, "admin.stopForm.seo_hint", "Leave blank to use the name and description automatically.")}
      </p>

      {/* Google preview */}
      <div className="rounded-xl border border-brand-cream/10 bg-brand-cream/[0.03] px-4 py-3 space-y-0.5">
        <p className="text-[13px] text-[#1a0dab] truncate">{displayTitle}</p>
        <p className="text-[11px] text-brand-cream/40">
          layover-legends.com/stops/{previewSlug || "…"}
        </p>
        <p className="text-[12px] text-brand-cream/65 line-clamp-2">{displayDesc}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="meta_title" className={labelClass}>{lbl(labels, "admin.stopForm.meta_title_label", "Meta title")}</label>
          <span className={`text-xs tabular-nums ${title.length > 60 ? "text-brand-orange" : "text-brand-cream/40"}`}>
            {title.length}/70
          </span>
        </div>
        <input
          id="meta_title"
          name="meta_title"
          type="text"
          maxLength={70}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder={`${previewName} · LayoverAmsterdam`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="meta_description" className={labelClass}>{lbl(labels, "admin.stopForm.meta_desc_label", "Meta description")}</label>
          <span className={`text-xs tabular-nums ${desc.length > 140 ? "text-brand-orange" : "text-brand-cream/40"}`}>
            {desc.length}/160
          </span>
        </div>
        <textarea
          id="meta_description"
          name="meta_description"
          rows={3}
          maxLength={160}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className={inputClass + " resize-none"}
          placeholder={lbl(labels, "admin.stopForm.meta_desc_placeholder", "What makes this stop worth a layover detour? (auto-generated when blank)")}
        />
      </div>
    </fieldset>
  );
}

export default function StopForm({ stop, categories, action, mode, deleteAction, labels }: Props) {
  return (
    <form action={action} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClass}>{lbl(labels, "admin.stopForm.name_label", "Name")}</label>
          <input id="name" name="name" type="text" required maxLength={200}
            defaultValue={stop?.name ?? ""} className={inputClass}
            placeholder={lbl(labels, "admin.stopForm.name_placeholder", "e.g. Dam Square")} />
        </div>
        <div>
          <label htmlFor="category_id" className={labelClass}>{lbl(labels, "admin.stopForm.category_label", "Category")}</label>
          <select id="category_id" name="category_id" required defaultValue={stop?.category_id ?? ""}
            className={inputClass + " [&>option]:bg-brand-navy [&>option]:text-brand-cream"}>
            <option value="" disabled style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}>
              {lbl(labels, "admin.stopForm.category_placeholder", "Pick a category…")}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="slug" className={labelClass}>{lbl(labels, "admin.stopForm.slug_label", "Slug (URL)")}</label>
          <input id="slug" name="slug" type="text" maxLength={200}
            defaultValue={stop?.slug ?? ""} className={inputClass + " font-mono text-sm"}
            placeholder={lbl(labels, "admin.stopForm.slug_placeholder", "leave blank to auto-generate from name")} />
        </div>
        <div>
          <label htmlFor="area" className={labelClass}>{lbl(labels, "admin.stopForm.area_label", "Neighborhood / area")}</label>
          <input id="area" name="area" type="text" maxLength={120}
            defaultValue={stop?.area ?? ""} className={inputClass}
            placeholder={lbl(labels, "admin.stopForm.area_placeholder", "e.g. Jordaan")} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>{lbl(labels, "admin.stopForm.description_label", "Description")}</label>
        <textarea id="description" name="description" rows={3} maxLength={1000}
          defaultValue={stop?.description ?? ""} className={inputClass + " resize-y"}
          placeholder={lbl(labels, "admin.stopForm.description_placeholder", "What makes this stop worth a layover detour?")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="latitude" className={labelClass}>{lbl(labels, "admin.stopForm.latitude_label", "Latitude")}</label>
          <input id="latitude" name="latitude" type="number" step="0.000001" min={-90} max={90}
            defaultValue={stop?.latitude ?? ""} className={inputClass + " tabular-nums"} placeholder="52.3676" />
        </div>
        <div>
          <label htmlFor="longitude" className={labelClass}>{lbl(labels, "admin.stopForm.longitude_label", "Longitude")}</label>
          <input id="longitude" name="longitude" type="number" step="0.000001" min={-180} max={180}
            defaultValue={stop?.longitude ?? ""} className={inputClass + " tabular-nums"} placeholder="4.9041" />
        </div>
        <p className="sm:col-span-2 -mt-3 text-xs text-brand-cream/45">
          {lbl(labels, "admin.stopForm.coords_hint", "Tip: open Google Maps, right-click the spot, and copy the lat/lng pair.")}
        </p>
      </div>

      <StopTypeRadio defaultValue={deriveType(stop)} labels={labels} />

      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <legend className={labelClass + " sm:col-span-3"}>{lbl(labels, "admin.stopForm.flags_legend", "Other flags")}</legend>
        <CheckboxField name="is_active" label={lbl(labels, "admin.stopForm.active_label", "Active")}
          hint={lbl(labels, "admin.stopForm.active_hint", "Visible on the public site.")}
          defaultChecked={stop ? stop.is_active : true} />
        <CheckboxField name="is_seasonal" label={lbl(labels, "admin.stopForm.seasonal_label", "Seasonal")}
          hint={lbl(labels, "admin.stopForm.seasonal_hint", "Only available during certain months.")}
          defaultChecked={!!stop?.is_seasonal} />
        <CheckboxField name="wheelchair_accessible" label={lbl(labels, "admin.stopForm.wheelchair_label", "Wheelchair accessible")}
          hint={lbl(labels, "admin.stopForm.wheelchair_hint", "Confirmed accessible entrance / interior.")}
          defaultChecked={!!stop?.wheelchair_accessible} />
      </fieldset>

      <SeoFields
        initialTitle={stop?.meta_title ?? null}
        initialDescription={stop?.meta_description ?? null}
        previewSlug={stop?.slug ?? ""}
        previewName={stop?.name ?? ""}
        labels={labels}
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <SaveButton mode={mode} labels={labels} />
        {mode === "edit" && deleteAction && <DeleteButton formAction={deleteAction} labels={labels} />}
        <a href="/admin/stops"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-brand-cream/20 text-brand-cream/70 hover:bg-brand-cream/5 transition-colors sm:ml-auto">
          {lbl(labels, "admin.stopForm.back", "Back to list")}
        </a>
      </div>
    </form>
  );
}
