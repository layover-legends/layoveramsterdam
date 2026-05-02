"use client";

import { useState, useTransition } from "react";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { upsertTranslation, autoTranslateField } from "@/app/admin/translations-actions";

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

  // values[locale][fieldKey] = current text in the input
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const l of NON_DEFAULT) {
      init[l.code] = { ...(existing[l.code] ?? {}) };
    }
    return init;
  });

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPendingSave, startSaveTransition] = useTransition();

  // Per-field auto-translate state
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleChange(locale: Locale, field: string, value: string) {
    setValues((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
    setSaved(false);
  }

  // Save all fields for the active locale as human-edited.
  async function handleSave(locale: Locale) {
    setSaveError(null);
    setSaved(false);
    for (const [field, value] of Object.entries(values[locale] ?? {})) {
      const result = await upsertTranslation(entityType, entityId, field, locale, value);
      if (!result.ok) { setSaveError(result.error); return; }
    }
    setSaved(true);
  }

  // Auto-translate a single field via DeepL and update local state.
  async function handleAutoTranslate(field: string) {
    setTranslatingField(field);
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    setSaved(false);

    const result = await autoTranslateField(entityType, entityId, field, activeLocale);

    setTranslatingField(null);
    if (!result.ok) {
      setFieldErrors((prev) => ({ ...prev, [field]: result.error }));
    } else {
      setValues((prev) => ({
        ...prev,
        [activeLocale]: { ...prev[activeLocale], [field]: result.value },
      }));
    }
  }

  const activeLabel = LOCALES.find((l) => l.code === activeLocale)?.label ?? activeLocale;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Locale tabs */}
      <div className="flex flex-wrap gap-2">
        {NON_DEFAULT.map((l) => (
          <button key={l.code} type="button"
            onClick={() => { setActiveLocale(l.code); setSaved(false); setSaveError(null); setFieldErrors({}); }}
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

      {/* Fields panel */}
      <div className="rounded-xl border border-brand-cream/10 bg-brand-cream/[0.03] p-5 space-y-5">
        <p className="text-xs text-brand-cream/45">
          {lbl(labels, "admin.translationsEditor.hint",
            "Leave a field blank to use the default language content as fallback.")}
        </p>

        {fields.map((f) => {
          const isTranslating = translatingField === f.key;
          const fieldError = fieldErrors[f.key];

          return (
            <div key={f.key} className="space-y-1.5">
              {/* Label + 🤖 button */}
              <div className="flex items-center justify-between gap-2">
                <label className={labelClass}>{f.label}</label>
                <button
                  type="button"
                  disabled={isTranslating || !!translatingField}
                  onClick={() => handleAutoTranslate(f.key)}
                  title={`Auto-translate "${f.label}" from English using DeepL`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-brand-cream/5 border-brand-cream/15 text-brand-cream/60 hover:bg-brand-orange/10 hover:border-brand-orange/30 hover:text-brand-orange"
                >
                  {isTranslating ? (
                    <span className="animate-pulse">⏳</span>
                  ) : (
                    <span>🤖</span>
                  )}
                  <span>{isTranslating ? "Translating…" : "Auto-translate"}</span>
                </button>
              </div>

              {/* Input / textarea */}
              {f.multiline ? (
                <textarea
                  rows={3}
                  value={values[activeLocale]?.[f.key] ?? ""}
                  onChange={(e) => handleChange(activeLocale, f.key, e.target.value)}
                  className={inputBase + " resize-y"}
                  placeholder={`${f.label} in ${activeLabel}…`}
                />
              ) : (
                <input
                  type="text"
                  value={values[activeLocale]?.[f.key] ?? ""}
                  onChange={(e) => handleChange(activeLocale, f.key, e.target.value)}
                  className={inputBase}
                  placeholder={`${f.label} in ${activeLabel}…`}
                />
              )}

              {/* Per-field error */}
              {fieldError && (
                <p className="text-xs text-red-300">{fieldError}</p>
              )}
            </div>
          );
        })}

        {/* Save-all status */}
        {saveError && <p className="text-sm text-red-300">{saveError}</p>}
        {saved && (
          <p className="text-sm text-emerald-300">
            {lbl(labels, "admin.translationsEditor.saved", "Saved.")}
          </p>
        )}

        {/* Save all as human */}
        <button
          type="button"
          disabled={isPendingSave}
          onClick={() => startSaveTransition(() => handleSave(activeLocale))}
          className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-brand-orange text-brand-navy text-sm font-semibold disabled:opacity-60 hover:scale-[1.02] transition-all"
        >
          {isPendingSave
            ? lbl(labels, "admin.translationsEditor.saving", "Saving…")
            : (labels?.["admin.translationsEditor.save"] ?? `Save ${activeLabel} as human`).replace("{locale}", activeLabel)}
        </button>
      </div>
    </div>
  );
}
