"use client";

import { useState, useTransition } from "react";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { upsertTranslation } from "@/app/admin/translations-actions";

type FieldDef = { key: string; label: string; multiline?: boolean };

type Props = {
  entityType: string;
  entityId: string;
  fields: FieldDef[];
  /** Pre-loaded existing translations: language → field → value */
  existing: Record<string, Record<string, string>>;
  labels?: Record<string, string>;
};

function lbl(labels: Record<string, string> | undefined, key: string, fallback: string): string {
  return labels?.[key] ?? fallback;
}

const labelClass = "block text-xs uppercase tracking-wide text-brand-cream/60 mb-1";
const inputBase =
  "w-full px-3 py-2 rounded-lg bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/60";

const NON_DEFAULT = LOCALES.filter((l) => l.code !== DEFAULT_LOCALE);

export default function TranslationsEditor({ entityType, entityId, fields, existing, labels }: Props) {
  const [activeLocale, setActiveLocale] = useState<Locale>(NON_DEFAULT[0].code);
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const l of NON_DEFAULT) {
      init[l.code] = { ...(existing[l.code] ?? {}) };
    }
    return init;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(locale: Locale, field: string, value: string) {
    setValues((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
    setSaved(false);
  }

  async function handleSave(locale: Locale) {
    setError(null);
    setSaved(false);
    for (const [field, value] of Object.entries(values[locale] ?? {})) {
      const result = await upsertTranslation(entityType, entityId, field, locale, value);
      if (!result.ok) { setError(result.error); return; }
    }
    setSaved(true);
  }

  const activeLabel = LOCALES.find((l) => l.code === activeLocale)?.label ?? activeLocale;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {NON_DEFAULT.map((l) => (
          <button key={l.code} type="button"
            onClick={() => { setActiveLocale(l.code); setSaved(false); setError(null); }}
            className={
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors " +
              (activeLocale === l.code
                ? "bg-brand-orange/15 border-brand-orange/40 text-brand-orange font-medium"
                : "border-brand-cream/15 text-brand-cream/60 hover:bg-brand-cream/5")
            }>
            {l.flag} {l.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-brand-cream/10 bg-brand-cream/[0.03] p-5 space-y-4">
        <p className="text-xs text-brand-cream/45">
          {lbl(labels, "admin.translationsEditor.hint", "Leave a field blank to use the default language content as fallback.")}
        </p>

        {fields.map((f) => (
          <div key={f.key}>
            <label className={labelClass}>{f.label}</label>
            {f.multiline ? (
              <textarea rows={3} value={values[activeLocale]?.[f.key] ?? ""}
                onChange={(e) => handleChange(activeLocale, f.key, e.target.value)}
                className={inputBase + " resize-y"}
                placeholder={`${f.label} in ${activeLabel}…`} />
            ) : (
              <input type="text" value={values[activeLocale]?.[f.key] ?? ""}
                onChange={(e) => handleChange(activeLocale, f.key, e.target.value)}
                className={inputBase}
                placeholder={`${f.label} in ${activeLabel}…`} />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-300">{error}</p>}
        {saved && <p className="text-sm text-emerald-300">{lbl(labels, "admin.translationsEditor.saved", "Saved.")}</p>}

        <button type="button" disabled={isPending}
          onClick={() => startTransition(() => handleSave(activeLocale))}
          className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-brand-orange text-brand-navy text-sm font-semibold disabled:opacity-60 hover:scale-[1.02] transition-all">
          {isPending
            ? lbl(labels, "admin.translationsEditor.saving", "Saving…")
            : (labels?.["admin.translationsEditor.save"] ?? `Save ${activeLabel}`).replace("{locale}", activeLabel)}
        </button>
      </div>
    </div>
  );
}
