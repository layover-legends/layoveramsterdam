import { notFound } from "next/navigation";
import ArticleForm from "@/components/admin/ArticleForm";
import { getArticleById } from "@/lib/admin/articles";
import { updateArticle, deleteArticle } from "@/app/admin/articles/actions";
import { getUiStrings, t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
};

export default async function EditArticlePage({ params, searchParams }: PageProps) {
  const [article, s] = await Promise.all([getArticleById(params.id), getUiStrings()]);
  if (!article) notFound();

  const updateAction = updateArticle.bind(null, article.id);
  const deleteAction = deleteArticle.bind(null, article.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-brand-cream/55">
          {article.is_published ? t(s, "admin.articles.status_published", "Published") : t(s, "admin.common.draft", "Draft")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight line-clamp-2">{article.title}</h1>
      </header>

      {searchParams?.saved === "1" && (
        <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t(s, "admin.common.saved", "Saved.")}
        </div>
      )}
      {searchParams?.error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {searchParams.error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-brand-cream/55">{t(s, "admin.article.content_section", "Content")}</h2>
        <ArticleForm article={article} action={updateAction} deleteAction={deleteAction} mode="edit" labels={s} />
      </section>
    </div>
  );
}
