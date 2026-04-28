import { notFound } from "next/navigation";
import StopForm from "@/components/admin/StopForm";
import PhotoManager from "@/components/admin/PhotoManager";
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

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
};

export default async function EditStopPage({ params, searchParams }: PageProps) {
  const [stop, categories, photos] = await Promise.all([
    getStopById(params.id),
    listCategories(),
    listPhotosFor(params.id),
  ]);
  if (!stop) {
    notFound();
  }

  const saved = searchParams?.saved === "1";
  const error = searchParams?.error;

  // Bind ids into the actions so the forms can call them with formData.
  const updateAction = updateStop.bind(null, stop.id);
  const deleteAction = deleteStop.bind(null, stop.id);
  const addPhotoAction = addPhoto.bind(null, stop.id);
  const deletePhotoAction = deletePhoto.bind(null, stop.id);
  const makePrimaryAction = makePrimaryPhoto.bind(null, stop.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        {stop.category_name && (
          <p className="text-xs uppercase tracking-wide text-brand-cream/55">
            {stop.category_name}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {stop.name}
        </h1>
      </header>

      {saved && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Saved.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
          Photos
        </h2>
        <PhotoManager
          destinationId={stop.id}
          photos={photos}
          addAction={addPhotoAction}
          deleteAction={deletePhotoAction}
          primaryAction={makePrimaryAction}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">
          Details
        </h2>
        <StopForm
          stop={stop}
          categories={categories}
          action={updateAction}
          deleteAction={deleteAction}
          mode="edit"
        />
      </section>
    </div>
  );
}
