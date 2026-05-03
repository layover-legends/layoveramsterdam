"use client";

import { useState, useTransition } from "react";
import { updateServiceFields } from "@/app/admin/services/actions";
import { formatPrice } from "@/lib/i18n/format-price";

type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  cogs_cents: number | null;
  vat_rate: number;
  sort_order: number;
};

type Props = {
  service: ServiceRow;
  onClose: () => void;
};

export default function ServiceEditDrawer({ service, onClose }: Props) {
  const [priceCents, setPriceCents] = useState(String(service.price_cents));
  const [cogsCents, setCogsCents] = useState(service.cogs_cents != null ? String(service.cogs_cents) : "");
  const [vatRate, setVatRate] = useState(String(Math.round(service.vat_rate * 100)));
  const [sortOrder, setSortOrder] = useState(String(service.sort_order));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateServiceFields(service.id, {
        price_cents: parseInt(priceCents, 10) || service.price_cents,
        cogs_cents: cogsCents !== "" ? parseInt(cogsCents, 10) : null,
        vat_rate: (parseInt(vatRate, 10) || 21) / 100,
        sort_order: parseInt(sortOrder, 10) || service.sort_order,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-ink-black border-l border-warm-cream/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-cream/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-warm-cream/40 mb-0.5">Edit service</p>
            <h2 className="font-semibold text-warm-cream text-sm">{service.name}</h2>
            <p className="text-[10px] text-warm-cream/35 font-mono">{service.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-warm-cream/50 hover:text-warm-cream hover:bg-warm-cream/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <Field label="Price (cents)">
            <input
              type="number"
              min="0"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-cream/15 bg-warm-cream/5 text-sm text-warm-cream font-mono focus:outline-none focus:border-legend-gold/50"
            />
            <p className="text-[10px] text-warm-cream/35 mt-1">
              = {formatPrice(parseInt(priceCents, 10) || 0, "EUR")}
            </p>
          </Field>

          <Field label="COGS (cents)" hint="Leave blank if unknown">
            <input
              type="number"
              min="0"
              value={cogsCents}
              onChange={(e) => setCogsCents(e.target.value)}
              placeholder="—"
              className="w-full px-3 py-2 rounded-lg border border-warm-cream/15 bg-warm-cream/5 text-sm text-warm-cream font-mono focus:outline-none focus:border-legend-gold/50"
            />
          </Field>

          <Field label="VAT rate (%)">
            <input
              type="number"
              min="0"
              max="100"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-cream/15 bg-warm-cream/5 text-sm text-warm-cream font-mono focus:outline-none focus:border-legend-gold/50"
            />
          </Field>

          <Field label="Sort order">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-cream/15 bg-warm-cream/5 text-sm text-warm-cream font-mono focus:outline-none focus:border-legend-gold/50"
            />
          </Field>
        </div>

        <div className="px-5 py-4 border-t border-warm-cream/10 flex gap-3">
          <button
            onClick={handleSave}
            disabled={pending}
            className="flex-1 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {saved ? "Saved ✓" : pending ? "Saving…" : "Save changes"}
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-warm-cream/60 uppercase tracking-wider">
        {label}
        {hint && <span className="normal-case tracking-normal font-normal text-warm-cream/35 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
