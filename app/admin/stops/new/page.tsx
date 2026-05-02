import StopForm from "@/components/admin/StopForm";
import { listCategories } from "@/lib/admin/stops";
import { createStop } from "@/app/admin/stops/actions";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { error?: string };
};

export default async function NewStopPage({ searchParams }: PageProps) {
  const [categories, s] = await Promise.all([listCategories(), getUiStrings()]);
  const error = searchParams?.error;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t(s, "admin.stop.new_title", "Add a new stop")}
        </h1>
        <p className="text-sm text-warm-cream/60">
          {t(s, "admin.stop.new_subtitle", "Create the destination first, then add photos and opening hours on the next screen.")}
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <StopForm categories={categories} action={createStop} mode="create" labels={s} />
    </div>
  );
}
