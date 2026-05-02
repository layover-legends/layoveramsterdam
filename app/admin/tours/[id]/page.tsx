import { notFound } from "next/navigation";
import TourForm from "@/components/admin/TourForm";
import TourStopsEditor from "@/components/admin/TourStopsEditor";
import TranslationsEditor from "@/components/admin/TranslationsEditor";
import { getTourById } from "@/lib/admin/tours";
import { getTourStops } from "@/lib/admin/tour-stops";
import { updateTour, deleteTour } from "@/app/admin/tours/actions";
import { createClient } from "@/lib/supabase/server";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { getUiStrings, t, tpl } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
};

const TOUR_FIELDS = [
  { key: "name",        label: "Name" },
  { key: "tagline",     label: "Tagline" },
  { key: "description", label: "Description", multiline: true },
];

async function loadExistingTranslations(entityId: string) {
  const supabase = createClient();
  const langs = LOCALES.filter((l) => l.code !== DEFAULT_LOCALE).map((l) => l.code);
  const { data } = await supabase
    .from("translations")
    .select("language, field, value")
    .eq("entity_type", "tour")
    .eq("entity_id", entityId)
    .in("language", langs);
  const result: Record<string, Record<string, string>> = {};
  for (const row of (data ?? []) as Array<{ language: string; field: string; value: string }>) {
    if (!result[row.language]) result[row.language] = {};
    result[row.language][row.field] = row.value;
  }
  return result;
}

export default async function EditTourPage({ params, searchParams }: PageProps) {
  const [tour, stops, existingTranslations, s] = await Promise.all([
    getTourById(params.id),
    getTourStops(params.id),
    loadExistingTranslations(params.id),
    getUiStrings(),
  ]);
  if (!tour) notFound();

  const saved = searchParams?.saved === "1";
  const error = searchParams?.error;

  const updateAction = updateTour.bind(null, tour.id);
  const deleteAction = deleteTour.bind(null, tour.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-brand-cream/55">
          {tour.is_active ? t(s, "admin.common.active", "Active") : t(s, "admin.common.draft", "Draft")}
          {tour.duration_hours !== null ? ` · ${tour.duration_hours}h` : ""}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tour.name}</h1>
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
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
          {tpl(t(s, "admin.tour.stops_section", "Stops ({count})"), { count: stops.length })}
        </h2>
        <TourStopsEditor tourId={tour.id} initialStops={stops} labels={s} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">{t(s, "admin.tour.details_section", "Details")}</h2>
        <TourForm tour={tour} action={updateAction} deleteAction={deleteAction} mode="edit" labels={s} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">{t(s, "admin.tour.translations_section", "Translations")}</h2>
        <p className="text-xs text-brand-cream/45">
          {t(s, "admin.tour.translations_hint", "Edit name, tagline, and description in each non-English language.")}
        </p>
        <TranslationsEditor
          entityType="tour"
          entityId={tour.id}
          fields={TOUR_FIELDS}
          existing={existingTranslations}
          labels={s}
        />
      </section>
    </div>
  );
}
