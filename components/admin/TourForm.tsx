"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Tour } from "@/lib/admin/tours-types";

type Props = {
  tour?: Tour | null;
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  deleteAction?: (formData: FormData) => void | Promise<void>;
  labels?: Record<string, string>;
};

function lbl(labels: Record<string, string> | undefined, key: string, fallback: string): string {
  return labels?.[key] ?? fallback;
}

const labelClass =
  "block text-xs uppercase tracking-wide text-warm-cream/60 mb-1";
const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/60 focus:border-legend-gold/60";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD"] as const;

function SaveButton({ mode, labels }: { mode: "create" | "edit"; labels?: Record<string, string> }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
      {pending
        ? lbl(labels, "admin.tourForm.saving", "Saving…")
        : mode === "create"
        ? lbl(labels, "admin.tourForm.create", "Create tour")
        : lbl(labels, "admin.tourForm.save", "Save changes")}
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
        if (!confirm(lbl(labels, "admin.tourForm.confirm_delete", "Delete this tour permanently? All stop associations will be removed too."))) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-red-400/40 text-red-200 hover:bg-red-400/10 transition-colors disabled:opacity-60">
      {lbl(labels, "admin.tourForm.delete", "Delete")}
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
    <label className="flex items-start gap-3 p-3 rounded-xl bg-warm-cream/5 border border-warm-cream/10 cursor-pointer hover:bg-warm-cream/[0.07] transition-colors">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-warm-cream/40 bg-warm-cream/10 text-legend-gold focus:ring-legend-gold/60"
      />
      <span className="text-sm text-warm-cream/85">
        <span className="font-medium text-warm-cream">{label}</span>
        {hint && <span className="block text-xs text-warm-cream/55 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

function TourSeoFields({
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
  const displayDesc = desc || lbl(labels, "admin.tourForm.seo_hint", "Leave blank to use the description automatically.");
  return (
    <fieldset className="space-y-4">
      <legend className={labelClass + " mb-2"}>{lbl(labels, "admin.tourForm.seo_legend", "Search engine snippet")}</legend>
      <p className="text-xs text-warm-cream/45 -mt-2">
        {lbl(labels, "admin.tourForm.seo_hint", "Leave blank to use the name and description automatically.")}
      </p>

      <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] px-4 py-3 space-y-0.5">
        <p className="text-[13px] text-[#1a0dab] truncate">{displayTitle}</p>
        <p className="text-[11px] text-warm-cream/40">
          layover-legends.com/tours/{previewSlug || "…"}
        </p>
        <p className="text-[12px] text-warm-cream/65 line-clamp-2">{displayDesc}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="tour_meta_title" className={labelClass}>{lbl(labels, "admin.tourForm.meta_title_label", "Meta title")}</label>
          <span className={`text-xs tabular-nums ${title.length > 60 ? "text-legend-gold" : "text-warm-cream/40"}`}>
            {title.length}/70
          </span>
        </div>
        <input
          id="tour_meta_title"
          name="meta_title"
          type="text"
          maxLength={70}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder={`${previewName || "Tour name"} · LayoverAmsterdam`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="tour_meta_description" className={labelClass}>{lbl(labels, "admin.tourForm.meta_desc_label", "Meta description")}</label>
          <span className={`text-xs tabular-nums ${desc.length > 140 ? "text-legend-gold" : "text-warm-cream/40"}`}>
            {desc.length}/160
          </span>
        </div>
        <textarea
          id="tour_meta_description"
          name="meta_description"
          rows={3}
          maxLength={160}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className={inputClass + " resize-none"}
          placeholder={lbl(labels, "admin.tourForm.meta_desc_placeholder", "Why should a Schiphol traveler book this tour? (auto-generated when blank)")}
        />
      </div>
    </fieldset>
  );
}

export default function TourForm({ tour, action, mode, deleteAction, labels }: Props) {
  return (
    <form action={action} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className={labelClass}>{lbl(labels, "admin.tourForm.name_label", "Name")}</label>
          <input id="name" name="name" type="text" required maxLength={200}
            defaultValue={tour?.name ?? ""} className={inputClass}
            placeholder={lbl(labels, "admin.tourForm.name_placeholder", "e.g. Golden Age Canal Walk")} />
        </div>
        <div>
          <label htmlFor="slug" className={labelClass}>{lbl(labels, "admin.tourForm.slug_label", "Slug (URL)")}</label>
          <input id="slug" name="slug" type="text" maxLength={200}
            defaultValue={tour?.slug ?? ""} className={inputClass + " font-mono text-sm"}
            placeholder={lbl(labels, "admin.tourForm.slug_placeholder", "leave blank to auto-generate from name")} />
        </div>
      </div>

      <div>
        <label htmlFor="tagline" className={labelClass}>{lbl(labels, "admin.tourForm.tagline_label", "Tagline")}</label>
        <input id="tagline" name="tagline" type="text" maxLength={300}
          defaultValue={tour?.tagline ?? ""} className={inputClass}
          placeholder={lbl(labels, "admin.tourForm.tagline_placeholder", "One punchy line shown on listing cards")} />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>{lbl(labels, "admin.tourForm.description_label", "Description")}</label>
        <textarea id="description" name="description" rows={4} maxLength={2000}
          defaultValue={tour?.description ?? ""} className={inputClass + " resize-y"}
          placeholder={lbl(labels, "admin.tourForm.description_placeholder", "Full tour description for the detail page")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <label htmlFor="duration_hours" className={labelClass}>{lbl(labels, "admin.tourForm.duration_label", "Duration (hours)")}</label>
          <input id="duration_hours" name="duration_hours" type="number" step="0.5" min="0.5" max="24"
            defaultValue={tour?.duration_hours ?? ""} className={inputClass + " tabular-nums"} placeholder="4" />
        </div>
        <div>
          <label htmlFor="price_cents" className={labelClass}>{lbl(labels, "admin.tourForm.price_cents_label", "Price (cents)")}</label>
          <input id="price_cents" name="price_cents" type="number" step="1" min="0"
            defaultValue={tour?.price_cents ?? ""} className={inputClass + " tabular-nums"} placeholder="2500 = €25.00" />
        </div>
        <div>
          <label htmlFor="currency" className={labelClass}>{lbl(labels, "admin.tourForm.currency_label", "Currency")}</label>
          <select id="currency" name="currency" defaultValue={tour?.currency ?? "EUR"} className={inputClass}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c} style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="max_group_size" className={labelClass}>{lbl(labels, "admin.tourForm.group_size_label", "Max group size")}</label>
          <input id="max_group_size" name="max_group_size" type="number" step="1" min="1"
            defaultValue={tour?.max_group_size ?? ""} className={inputClass + " tabular-nums"} placeholder="12" />
        </div>
      </div>
      <p className="-mt-3 text-xs text-warm-cream/45">
        {lbl(labels, "admin.tourForm.price_hint", "Price is stored in the smallest currency unit (cents). Leave blank for free tours.")}
      </p>

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <legend className={labelClass + " sm:col-span-2 lg:col-span-3"}>{lbl(labels, "admin.tourForm.flags_legend", "Flags")}</legend>
        <CheckboxField name="is_active" label={lbl(labels, "admin.tourForm.active_label", "Active")}
          hint={lbl(labels, "admin.tourForm.active_hint", "Visible on the public site.")}
          defaultChecked={tour ? tour.is_active : false} />
        <CheckboxField name="requires_booking" label={lbl(labels, "admin.tourForm.requires_booking_label", "Requires booking")}
          hint={lbl(labels, "admin.tourForm.requires_booking_hint", "Tour must be reserved in advance.")}
          defaultChecked={tour ? tour.requires_booking : true} />
        <CheckboxField name="is_seasonal" label={lbl(labels, "admin.tourForm.seasonal_label", "Seasonal")}
          hint={lbl(labels, "admin.tourForm.seasonal_hint", "Only available during certain months.")}
          defaultChecked={!!tour?.is_seasonal} />
        <CheckboxField name="is_adult_only" label={lbl(labels, "admin.tourForm.adult_only_label", "Adult only (18+)")}
          hint={lbl(labels, "admin.tourForm.adult_only_hint", "After-dark or age-restricted.")}
          defaultChecked={!!tour?.is_adult_only} />
      </fieldset>

      <TourSeoFields
        initialTitle={tour?.meta_title ?? null}
        initialDescription={tour?.meta_description ?? null}
        previewSlug={tour?.slug ?? ""}
        previewName={tour?.name ?? ""}
        labels={labels}
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <SaveButton mode={mode} labels={labels} />
        {mode === "edit" && deleteAction && <DeleteButton formAction={deleteAction} labels={labels} />}
        <a href="/admin/tours"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/70 hover:bg-warm-cream/5 transition-colors sm:ml-auto">
          {lbl(labels, "admin.tourForm.back", "Back to list")}
        </a>
      </div>
    </form>
  );
}
