import { notFound } from "next/navigation";
import StopForm from "@/components/admin/StopForm";
import PhotoManager from "@/components/admin/PhotoManager";
import TranslationsEditor from "@/components/admin/TranslationsEditor";
import {
  getStopById,
  listCategories,
  listPhotosFor,
} from "@/lib/admin/stops";
import {
  updateStop,
  deleteStop,
  addPhoto,
  deletePhoto,
  makePrimaryPhoto,
} from "@/app/admin/stops/actions";
import { createClient } from "@/lib/supabase/server";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
};

const STOP_FIELDS = [
  { key: "name",        label: "Name" },
  { key: "area",        label: "Neighbourhood / area" },
  { key: "description", label: "Description", multiline: true },
];

async function loadExistingTranslations(entityId: string) {
  const supabase = createClient();
  const langs = LOCALES.filter((l) => l.code !== DEFAULT_LOCALE).map((l) => l.code);
  const { data } = await supabase
    .from("translations")
    .select("language, field, value")
    .eq("entity_type", "destination")
    .eq("entity_id", entityId)
    .in("language", langs);
  const result: Record<string, Record<string, string>> = {};
  for (const row of (data ?? []) as Array<{ language: string; field: string; value: string }>) {
    if (!result[row.language]) result[row.language] = {};
    result[row.language][row.field] = row.value;
  }
  return result;
}

export default async function EditStopPage({ params, searchParams }: PageProps) {
  const [stop, categories, photos, existingTranslations, s] = await Promise.all([
    getStopById(params.id),
    listCategories(),
    listPhotosFor(params.id),
    loadExistingTranslations(params.id),
    getUiStrings(),
  ]);
  if (!stop) notFound();

  const saved = searchParams?.saved === "1";
  const error = searchParams?.error;

  const updateAction = updateStop.bind(null, stop.id);
  const deleteAction = deleteStop.bind(null, stop.id);
  const addPhotoAction = addPhoto.bind(null, stop.id);
  const deletePhotoAction = deletePhoto.bind(null, stop.id);
  const makePrimaryAction = makePrimaryPhoto.bind(null, stop.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        {stop.category_name && (
          <p className="text-xs uppercase tracking-wide text-warm-cream/55">{stop.category_name}</p>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{stop.name}</h1>
      </header>

      {saved && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.common.saved", "Saved.")}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-warm-cream/55">{t(s, "admin.stop.photos_section", "Photos")}</h2>
        <PhotoManager
          destinationId={stop.id}
          photos={photos}
          addAction={addPhotoAction}
          deleteAction={deletePhotoAction}
          primaryAction={makePrimaryAction}
          labels={s}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-warm-cream/55">{t(s, "admin.stop.details_section", "Details")}</h2>
        <StopForm stop={stop} categories={categories} action={updateAction} deleteAction={deleteAction} mode="edit" labels={s} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-warm-cream/55">{t(s, "admin.stop.translations_section", "Translations")}</h2>
        <p className="text-xs text-warm-cream/45">
          {t(s, "admin.stop.translations_hint", "Edit name, area, and description in each non-English language. Blank = falls back to the default content.")}
        </p>
        <TranslationsEditor
          entityType="destination"
          entityId={stop.id}
          fields={STOP_FIELDS}
          existing={existingTranslations}
          labels={s}
        />
      </section>
    </div>
  );
}
