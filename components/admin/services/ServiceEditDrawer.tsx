"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTourFields, updateAddonFields, createTour, createAddon } from "@/app/admin/services/actions";
import { syncServiceToStripe } from "@/app/actions/sync-stripe";
import { formatPrice } from "@/lib/i18n/format-price";
import ImageUploadField from "./ImageUploadField";

// ─────────────────────────────────────────────────────────────────────────────
// Row types (id === '__new__' means create mode)
// ─────────────────────────────────────────────────────────────────────────────

export type TourEditRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  is_active: boolean;
  price_cents: number;
  vat_rate: number;
  pricing_model: string;
  min_group_size: number;
  max_group_size: number | null;
  transport_mode: string;
  delivery_mode: string;
  duration_hours: number | null;
  is_adult_only: boolean;
  launch_mode: boolean;
  image_url: string | null;
};

export type AddonEditRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  cogs_cents: number | null;
  vat_rate: number;
  sort_order: number;
  pricing_model: string;
  service_type: string;
  availability_status: string;
  category: string;
  fulfillment: string;
  image_url: string | null;
};

type Props =
  | { source: "tour"; row: TourEditRow; cityId?: string; onClose: () => void }
  | { source: "addon"; row: AddonEditRow; cityId?: string; onClose: () => void };

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TRANSPORT_MODES = ["van", "bus", "public_transit", "walking", "bike"] as const;
const DELIVERY_MODES = ["human_guide", "ai_guide", "self_guided"] as const;
const SERVICE_TYPES = ["addon", "standalone", "both"] as const;
const AVAILABILITY = ["active", "coming_soon", "inactive"] as const;
const CATEGORIES = ["mobility", "connectivity", "tickets", "photo", "food", "comfort", "souvenir", "premium"] as const;
const FULFILLMENTS = ["digital", "physical_pickup", "partner_api", "onboard", "post_tour_delivery"] as const;
const PRICING_MODELS = ["flat", "per_person"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ServiceEditDrawer(props: Props) {
  const { source, row, cityId, onClose } = props;
  const isCreate = row.id === "__new__";
  const router = useRouter();

  // Common state
  const [slug, setSlug] = useState(row.slug);
  const [name, setName] = useState(row.name);
  const [description, setDescription] = useState(row.description ?? "");
  const [priceCents, setPriceCents] = useState(String(row.price_cents));
  const [vatRate, setVatRate] = useState(String(Math.round(row.vat_rate * 100)));
  const [pricingModel, setPricingModel] = useState(row.pricing_model);
  const [imageUrl, setImageUrl] = useState<string | null>(row.image_url);

  // Tour-specific state
  const tourRow = source === "tour" ? (row as TourEditRow) : null;
  const [tagline, setTagline] = useState(tourRow?.tagline ?? "");
  const [isActive, setIsActive] = useState(tourRow?.is_active ?? false);
  const [minGroup, setMinGroup] = useState(String(tourRow?.min_group_size ?? 1));
  const [maxGroup, setMaxGroup] = useState(String(tourRow?.max_group_size ?? ""));
  const [transportMode, setTransportMode] = useState(tourRow?.transport_mode ?? "van");
  const [deliveryMode, setDeliveryMode] = useState(tourRow?.delivery_mode ?? "human_guide");
  const [durationHours, setDurationHours] = useState(String(tourRow?.duration_hours ?? ""));
  const [isAdultOnly, setIsAdultOnly] = useState(tourRow?.is_adult_only ?? false);
  const [launchMode, setLaunchMode] = useState(tourRow?.launch_mode ?? true);

  // Addon-specific state
  const addonRow = source === "addon" ? (row as AddonEditRow) : null;
  const [cogsCents, setCogsCents] = useState(addonRow?.cogs_cents != null ? String(addonRow.cogs_cents) : "");
  const [sortOrder, setSortOrder] = useState(String(addonRow?.sort_order ?? 100));
  const [serviceType, setServiceType] = useState(addonRow?.service_type ?? "standalone");
  const [availabilityStatus, setAvailabilityStatus] = useState(addonRow?.availability_status ?? "inactive");
  const [category, setCategory] = useState(addonRow?.category ?? "premium");
  const [fulfillment, setFulfillment] = useState(addonRow?.fulfillment ?? "digital");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setErrorMsg(null);
    startTransition(async () => {
      const newPrice = parseInt(priceCents, 10) || row.price_cents;
      const priceChanged = newPrice !== row.price_cents;
      const imageChanged = imageUrl !== row.image_url;

      if (isCreate) {
        // ── Create mode ──────────────────────────────────────────────────────
        if (!cityId) {
          setErrorMsg("City ID missing — contact support");
          return;
        }

        let result: { id: string } | { error: string };

        if (source === "tour") {
          result = await createTour({
            slug,
            name: name.trim() || "Untitled",
            description: description.trim() || null,
            tagline: tagline.trim() || null,
            price_cents: newPrice,
            vat_rate: (parseInt(vatRate, 10) || 21) / 100,
            pricing_model: pricingModel,
            min_group_size: parseInt(minGroup, 10) || 1,
            max_group_size: maxGroup !== "" ? parseInt(maxGroup, 10) : null,
            transport_mode: transportMode,
            delivery_mode: deliveryMode,
            duration_hours: durationHours !== "" ? parseFloat(durationHours) : null,
            is_adult_only: isAdultOnly,
            launch_mode: launchMode,
            is_active: isActive,
            image_url: imageUrl,
            city_id: cityId,
          });
        } else {
          result = await createAddon({
            slug,
            name: name.trim() || "Untitled",
            description: description.trim() || null,
            price_cents: newPrice,
            cogs_cents: cogsCents !== "" ? parseInt(cogsCents, 10) : null,
            vat_rate: (parseInt(vatRate, 10) || 21) / 100,
            sort_order: parseInt(sortOrder, 10) || 100,
            pricing_model: pricingModel,
            service_type: serviceType,
            availability_status: availabilityStatus,
            category,
            fulfillment,
            image_url: imageUrl,
            city_id: cityId,
          });
        }

        if ("error" in result) {
          setErrorMsg(result.error);
          return;
        }

        router.refresh();
        onClose();
        return;
      }

      // ── Edit mode ──────────────────────────────────────────────────────────
      let updateResult: { ok: boolean; error?: string };

      if (source === "tour") {
        updateResult = await updateTourFields(
          row.id,
          {
            name: name.trim() || row.name,
            description: description.trim() || null,
            tagline: tagline.trim() || null,
            price_cents: newPrice,
            vat_rate: (parseInt(vatRate, 10) || 21) / 100,
            pricing_model: pricingModel,
            min_group_size: parseInt(minGroup, 10) || 1,
            max_group_size: maxGroup !== "" ? parseInt(maxGroup, 10) : null,
            transport_mode: transportMode,
            delivery_mode: deliveryMode,
            duration_hours: durationHours !== "" ? parseFloat(durationHours) : null,
            is_adult_only: isAdultOnly,
            launch_mode: launchMode,
            is_active: isActive,
            image_url: imageUrl,
          },
          { name: row.name, description: row.description, tagline: (row as TourEditRow).tagline },
        );
      } else {
        updateResult = await updateAddonFields(
          row.id,
          {
            name: name.trim() || row.name,
            description: description.trim() || null,
            price_cents: newPrice,
            cogs_cents: cogsCents !== "" ? parseInt(cogsCents, 10) : null,
            vat_rate: (parseInt(vatRate, 10) || 21) / 100,
            sort_order: parseInt(sortOrder, 10) || (addonRow?.sort_order ?? 100),
            pricing_model: pricingModel,
            service_type: serviceType,
            availability_status: availabilityStatus,
            category,
            fulfillment,
            image_url: imageUrl,
          },
          { name: row.name, description: row.description },
        );
      }

      if (!updateResult.ok) {
        setErrorMsg(updateResult.error ?? "Save failed");
        return;
      }

      // Sync to Stripe: full sync if price changed; image-only update otherwise
      if (priceChanged || imageChanged) {
        await syncServiceToStripe(source, row.id).catch(() => {});
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-ink-black border-l border-warm-cream/10 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-cream/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-warm-cream/40 mb-0.5">
              {isCreate ? `New ${source}` : `Edit ${source}`}
            </p>
            <h2 className="font-semibold text-warm-cream text-sm">
              {isCreate ? (name || `New ${source}`) : row.name}
            </h2>
            {!isCreate && (
              <p className="text-[10px] text-warm-cream/35 font-mono">{row.slug}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-warm-cream/50 hover:text-warm-cream hover:bg-warm-cream/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Image */}
          <Section label="Image" />
          <ImageUploadField
            source={source}
            slug={slug || row.slug}
            currentUrl={imageUrl}
            onChange={setImageUrl}
          />

          {/* ── Identity ──────────────────────────────────────────────────── */}
          <Section label="Identity" />

          {/* Slug (always editable in create mode; read-only in edit) */}
          {isCreate ? (
            <Field label="Slug" hint="lowercase, hyphens only">
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                placeholder="my-new-tour"
                className={INPUT}
              />
            </Field>
          ) : (
            <Field label="Slug">
              <p className="text-sm text-warm-cream/40 font-mono px-3 py-2 rounded-lg bg-warm-cream/[0.03] border border-warm-cream/8">
                {row.slug}
              </p>
            </Field>
          )}

          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </Field>

          {source === "tour" && (
            <Field label="Tagline">
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={INPUT} />
            </Field>
          )}

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`${INPUT} resize-none`}
            />
          </Field>

          {/* ── Pricing ───────────────────────────────────────────────────── */}
          <Section label="Pricing" />

          <Field label="Price (cents)">
            <input
              type="number"
              min="0"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
              className={INPUT}
            />
            <p className="text-[10px] text-warm-cream/35 mt-1">
              = {formatPrice(parseInt(priceCents, 10) || 0, "EUR")}
            </p>
          </Field>

          {source === "addon" && (
            <Field label="COGS (cents)" hint="blank = unknown">
              <input
                type="number"
                min="0"
                value={cogsCents}
                onChange={(e) => setCogsCents(e.target.value)}
                placeholder="—"
                className={INPUT}
              />
            </Field>
          )}

          <Field label="VAT rate (%)">
            <input
              type="number"
              min="0"
              max="100"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className={INPUT}
            />
          </Field>

          <Field label="Pricing model">
            <SelectField value={pricingModel} onChange={setPricingModel} options={PRICING_MODELS} />
          </Field>

          {source === "addon" && (
            <Field label="Sort order">
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={INPUT}
              />
            </Field>
          )}

          {/* ── Tour-specific ────────────────────────────────────────────── */}
          {source === "tour" && (
            <>
              <Section label="Capacity" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Min group">
                  <input
                    type="number"
                    min="1"
                    value={minGroup}
                    onChange={(e) => setMinGroup(e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Max group" hint="blank = ∞">
                  <input
                    type="number"
                    min="1"
                    value={maxGroup}
                    onChange={(e) => setMaxGroup(e.target.value)}
                    placeholder="—"
                    className={INPUT}
                  />
                </Field>
              </div>

              <Field label="Duration (hours)">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  placeholder="—"
                  className={INPUT}
                />
              </Field>

              <Section label="Operations" />

              <Field label="Transport mode">
                <SelectField value={transportMode} onChange={setTransportMode} options={TRANSPORT_MODES} />
              </Field>

              <Field label="Delivery mode">
                <SelectField value={deliveryMode} onChange={setDeliveryMode} options={DELIVERY_MODES} />
              </Field>

              <Section label="Flags" />

              <div className="space-y-2">
                <Toggle label="Active" checked={isActive} onChange={setIsActive} />
                <Toggle label="18+ only" checked={isAdultOnly} onChange={setIsAdultOnly} />
                <Toggle label="Launch mode (skip min group check)" checked={launchMode} onChange={setLaunchMode} />
              </div>
            </>
          )}

          {/* ── Addon-specific ───────────────────────────────────────────── */}
          {source === "addon" && (
            <>
              <Section label="Catalog" />

              <Field label="Service type">
                <SelectField value={serviceType} onChange={setServiceType} options={SERVICE_TYPES} />
              </Field>

              <Field label="Availability">
                <SelectField value={availabilityStatus} onChange={setAvailabilityStatus} options={AVAILABILITY} />
              </Field>

              <Field label="Category">
                <SelectField value={category} onChange={setCategory} options={CATEGORIES} />
              </Field>

              <Field label="Fulfillment">
                <SelectField value={fulfillment} onChange={setFulfillment} options={FULFILLMENTS} />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-warm-cream/10 flex gap-3">
          <button
            onClick={handleSave}
            disabled={pending}
            className="flex-1 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {saved
              ? "Saved ✓"
              : pending
                ? isCreate
                  ? "Creating…"
                  : "Saving…"
                : isCreate
                  ? "Create & sync to Stripe"
                  : "Save & sync to Stripe"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/60 text-sm hover:text-warm-cream hover:border-warm-cream/40 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-warm-cream/15 bg-warm-cream/5 text-sm text-warm-cream focus:outline-none focus:border-legend-gold/50 transition-colors";

function Section({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-cream/30 pt-2 border-t border-warm-cream/8">
      {label}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-warm-cream/60 uppercase tracking-wider">
        {label}
        {hint && (
          <span className="normal-case tracking-normal font-normal text-warm-cream/35 ml-1">
            ({hint})
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}
      className="w-full px-3 py-2 rounded-lg border border-warm-cream/15 text-sm focus:outline-none focus:border-legend-gold/50 transition-colors"
    >
      {options.map((o) => (
        <option key={o} value={o} style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-legend-gold" : "bg-warm-cream/15"}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-ink-black transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-sm text-warm-cream/70 group-hover:text-warm-cream transition-colors">
        {label}
      </span>
    </label>
  );
}
