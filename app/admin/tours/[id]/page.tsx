import { notFound } from "next/navigation";
import TourForm from "@/components/admin/TourForm";
import { getTourById } from "@/lib/admin/tours";
import { updateTour, deleteTour } from "@/app/admin/tours/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
};

export default async function EditTourPage({ params, searchParams }: PageProps) {
  const tour = await getTourById(params.id);
  if (!tour) notFound();

  const saved = searchParams?.saved === "1";
  const error = searchParams?.error;

  const updateAction = updateTour.bind(null, tour.id);
  const deleteAction = deleteTour.bind(null, tour.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-brand-cream/55">
          {tour.is_active ? "Active" : "Draft"}
          {tour.duration_hours !== null ? ` · ${tour.duration_hours}h` : ""}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tour.name}</h1>
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
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">Details</h2>
        <TourForm
          tour={tour}
          action={updateAction}
          deleteAction={deleteAction}
          mode="edit"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">Stops ({tour.stop_count})</h2>
        <p className="text-sm text-brand-cream/55">
          Stop-order editing via drag-and-drop is coming soon. For now, add or remove stops directly
          in the{" "}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-brand-orange transition-colors"
          >
            Supabase table editor
          </a>
          .
        </p>
      </section>
    </div>
  );
}
