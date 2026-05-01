import TourForm from "@/components/admin/TourForm";
import { createTour } from "@/app/admin/tours/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { error?: string };
};

export default async function NewTourPage({ searchParams }: PageProps) {
  const error = searchParams?.error;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Add a new tour</h1>
        <p className="text-sm text-brand-cream/60">
          Create the tour first, then add stops and details on the next screen.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <TourForm action={createTour} mode="create" />
    </div>
  );
}
