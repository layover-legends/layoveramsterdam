"use client";

import { useFormStatus } from "react-dom";
import type { Tour } from "@/lib/admin/tours-types";

type Props = {
  tour?: Tour | null;
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  deleteAction?: (formData: FormData) => void | Promise<void>;
};

const labelClass =
  "block text-xs uppercase tracking-wide text-brand-cream/60 mb-1";
const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD"] as const;

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
    >
      {pending ? "Saving…" : mode === "create" ? "Create tour" : "Save changes"}
    </button>
  );
}

function DeleteButton({
  formAction,
}: {
  formAction: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Delete this tour permanently? All stop associations will be removed too.")) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-red-400/40 text-red-200 hover:bg-red-400/10 transition-colors disabled:opacity-60"
    >
      Delete
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

export default function TourForm({ tour, action, mode, deleteAction }: Props) {
  return (
    <form action={action} className="space-y-6 max-w-3xl">
      {/* Name + slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className={labelClass}>Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={200}
            defaultValue={tour?.name ?? ""}
            className={inputClass}
            placeholder="e.g. Golden Age Canal Walk"
          />
        </div>
        <div>
          <label htmlFor="slug" className={labelClass}>Slug (URL)</label>
          <input
            id="slug"
            name="slug"
            type="text"
            maxLength={200}
            defaultValue={tour?.slug ?? ""}
            className={inputClass + " font-mono text-sm"}
            placeholder="leave blank to auto-generate from name"
          />
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label htmlFor="tagline" className={labelClass}>Tagline</label>
        <input
          id="tagline"
          name="tagline"
          type="text"
          maxLength={300}
          defaultValue={tour?.tagline ?? ""}
          className={inputClass}
          placeholder="One punchy line shown on listing cards"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>Description</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={tour?.description ?? ""}
          className={inputClass + " resize-y"}
          placeholder="Full tour description for the detail page"
        />
      </div>

      {/* Duration + price + currency + group size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <label htmlFor="duration_hours" className={labelClass}>Duration (hours)</label>
          <input
            id="duration_hours"
            name="duration_hours"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            defaultValue={tour?.duration_hours ?? ""}
            className={inputClass + " tabular-nums"}
            placeholder="4"
          />
        </div>
        <div>
          <label htmlFor="price_cents" className={labelClass}>Price (cents)</label>
          <input
            id="price_cents"
            name="price_cents"
            type="number"
            step="1"
            min="0"
            defaultValue={tour?.price_cents ?? ""}
            className={inputClass + " tabular-nums"}
            placeholder="2500 = €25.00"
          />
        </div>
        <div>
          <label htmlFor="currency" className={labelClass}>Currency</label>
          <select
            id="currency"
            name="currency"
            defaultValue={tour?.currency ?? "EUR"}
            className={inputClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="max_group_size" className={labelClass}>Max group size</label>
          <input
            id="max_group_size"
            name="max_group_size"
            type="number"
            step="1"
            min="1"
            defaultValue={tour?.max_group_size ?? ""}
            className={inputClass + " tabular-nums"}
            placeholder="12"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-brand-cream/45">
        Price is stored in the smallest currency unit (cents). Leave blank for free tours. Duration and group size are displayed on tour cards.
      </p>

      {/* Flags */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <legend className={labelClass + " sm:col-span-2 lg:col-span-3"}>Flags</legend>
        <CheckboxField
          name="is_active"
          label="Active"
          hint="Visible on the public site."
          defaultChecked={tour ? tour.is_active : false}
        />
        <CheckboxField
          name="requires_booking"
          label="Requires booking"
          hint="Tour must be reserved in advance."
          defaultChecked={tour ? tour.requires_booking : true}
        />
        <CheckboxField
          name="is_seasonal"
          label="Seasonal"
          hint="Only available during certain months."
          defaultChecked={!!tour?.is_seasonal}
        />
        <CheckboxField
          name="is_adult_only"
          label="Adult only (18+)"
          hint="After-dark or age-restricted."
          defaultChecked={!!tour?.is_adult_only}
        />
      </fieldset>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <SaveButton mode={mode} />
        {mode === "edit" && deleteAction && <DeleteButton formAction={deleteAction} />}
        <a
          href="/admin/tours"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-brand-cream/20 text-brand-cream/70 hover:bg-brand-cream/5 transition-colors sm:ml-auto"
        >
          Back to list
        </a>
      </div>
    </form>
  );
}
