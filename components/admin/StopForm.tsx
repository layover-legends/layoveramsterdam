"use client";

import { useFormStatus } from "react-dom";
import type { Category, Stop } from "@/lib/admin/stops-types";

type Props = {
  stop?: Stop | null;
  categories: Category[];
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  deleteAction?: (formData: FormData) => void | Promise<void>;
};

const labelClass =
  "block text-xs uppercase tracking-wide text-brand-cream/60 mb-1";
const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60";

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
    >
      {pending ? "Saving…" : mode === "create" ? "Create stop" : "Save changes"}
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
        if (!confirm("Delete this stop permanently? Photos will be removed too.")) {
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

export default function StopForm({ stop, categories, action, mode, deleteAction }: Props) {
  return (
    <form action={action} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClass}>Name</label>
          <input id="name" name="name" type="text" required maxLength={200}
            defaultValue={stop?.name ?? ""}
            className={inputClass} placeholder="e.g. Dam Square" />
        </div>
        <div>
          <label htmlFor="category_id" className={labelClass}>Category</label>
          <select id="category_id" name="category_id" required
            defaultValue={stop?.category_id ?? ""}
            className={inputClass + " [&>option]:bg-brand-navy [&>option]:text-brand-cream"}>
            <option value="" disabled style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}>
              Pick a category…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} style={{ backgroundColor: "#0F172A", color: "#FFF7ED" }}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="slug" className={labelClass}>Slug (URL)</label>
          <input id="slug" name="slug" type="text" maxLength={200}
            defaultValue={stop?.slug ?? ""}
            className={inputClass + " font-mono text-sm"}
            placeholder="leave blank to auto-generate from name" />
        </div>
        <div>
          <label htmlFor="area" className={labelClass}>Neighborhood / area</label>
          <input id="area" name="area" type="text" maxLength={120}
            defaultValue={stop?.area ?? ""}
            className={inputClass} placeholder="e.g. Jordaan" />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>Description</label>
        <textarea id="description" name="description" rows={3} maxLength={1000}
          defaultValue={stop?.description ?? ""}
          className={inputClass + " resize-y"}
          placeholder="What makes this stop worth a layover detour?" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="latitude" className={labelClass}>Latitude</label>
          <input id="latitude" name="latitude" type="number" step="0.000001" min={-90} max={90}
            defaultValue={stop?.latitude ?? ""}
            className={inputClass + " tabular-nums"} placeholder="52.3676" />
        </div>
        <div>
          <label htmlFor="longitude" className={labelClass}>Longitude</label>
          <input id="longitude" name="longitude" type="number" step="0.000001" min={-180} max={180}
            defaultValue={stop?.longitude ?? ""}
            className={inputClass + " tabular-nums"} placeholder="4.9041" />
        </div>
        <p className="sm:col-span-2 -mt-3 text-xs text-brand-cream/45">
          Tip: open <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="underline">Google Maps</a>, right-click the spot, and copy the lat/lng pair.
        </p>
      </div>

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <legend className={labelClass + " sm:col-span-2 lg:col-span-3"}>Flags</legend>
        <CheckboxField name="is_active" label="Active"
          hint="Visible on the public site."
          defaultChecked={stop ? stop.is_active : true} />
        <CheckboxField name="requires_booking" label="Requires booking"
          hint="Paid/bookable destinations are excluded from the free catalog."
          defaultChecked={!!stop?.requires_booking} />
        <CheckboxField name="is_seasonal" label="Seasonal"
          hint="Only available during certain months."
          defaultChecked={!!stop?.is_seasonal} />
        <CheckboxField name="is_adult_only" label="Adult only (18+)"
          hint="After-dark / age-restricted."
          defaultChecked={!!stop?.is_adult_only} />
        <CheckboxField name="wheelchair_accessible" label="Wheelchair accessible"
          hint="Confirmed accessible entrance / interior."
          defaultChecked={!!stop?.wheelchair_accessible} />
      </fieldset>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <SaveButton mode={mode} />
        {mode === "edit" && deleteAction && <DeleteButton formAction={deleteAction} />}
        <a href="/admin/stops"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-brand-cream/20 text-brand-cream/70 hover:bg-brand-cream/5 transition-colors sm:ml-auto">
          Back to list
        </a>
      </div>
    </form>
  );
}
