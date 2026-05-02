import ArticleForm from "@/components/admin/ArticleForm";
import { createArticle } from "@/app/admin/articles/actions";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: { error?: string } };

export default async function NewArticlePage({ searchParams }: PageProps) {
  const s = await getUiStrings();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{t(s, "admin.article.new_title", "New article")}</h1>
        <p className="text-sm text-warm-cream/60">{t(s, "admin.article.new_subtitle", "Write in Markdown. Publish when ready.")}</p>
      </header>

      {searchParams?.error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {searchParams.error}
        </div>
      )}

      <ArticleForm action={createArticle} mode="create" labels={s} />
    </div>
  );
}
