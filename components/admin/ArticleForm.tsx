"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Article } from "@/lib/admin/articles-types";

type Props = {
  article?: Article | null;
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  deleteAction?: () => void | Promise<void>;
  labels?: Record<string, string>;
};

function lbl(labels: Record<string, string> | undefined, key: string, fallback: string): string {
  return labels?.[key] ?? fallback;
}

const labelClass = "block text-xs uppercase tracking-wide text-warm-cream/60 mb-1";
const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:ring-2 focus:ring-legend-gold/60 focus:border-legend-gold/60";

function SaveButton({ mode, labels }: { mode: "create" | "edit"; labels?: Record<string, string> }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-legend-gold text-ink-black font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
      {pending
        ? lbl(labels, "admin.articleForm.saving", "Saving…")
        : mode === "create"
        ? lbl(labels, "admin.articleForm.create", "Create article")
        : lbl(labels, "admin.articleForm.save", "Save changes")}
    </button>
  );
}

function DeleteButton({ formAction, labels }: { formAction: () => void | Promise<void>; labels?: Record<string, string> }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending}
      onClick={(e) => {
        if (!confirm(lbl(labels, "admin.articleForm.confirm_delete", "Delete this article permanently?"))) e.preventDefault();
      }}
      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-red-400/40 text-red-200 hover:bg-red-400/10 transition-colors disabled:opacity-60">
      {lbl(labels, "admin.articleForm.delete", "Delete")}
    </button>
  );
}

export default function ArticleForm({ article, action, mode, deleteAction, labels }: Props) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [metaTitle, setMetaTitle] = useState(article?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(article?.meta_description ?? "");
  const [coverUrl, setCoverUrl] = useState(article?.cover_url ?? "");

  // Auto-generate slug from title in create mode.
  function handleTitleChange(v: string) {
    setTitle(v);
    if (mode === "create") {
      setSlug(
        v.toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      );
    }
  }

  const previewTitle = metaTitle || `${title || "Article title"} · LayoverAmsterdam`;
  const previewDesc = metaDesc || excerpt || "Leave blank to use excerpt automatically.";

  return (
    <form action={action} className="space-y-6 max-w-3xl">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="title" className={labelClass}>{lbl(labels, "admin.articleForm.title_label", "Title")}</label>
          <input id="title" name="title" type="text" required maxLength={200}
            value={title} onChange={(e) => handleTitleChange(e.target.value)} className={inputClass}
            placeholder={lbl(labels, "admin.articleForm.title_placeholder", "e.g. What to do during a 6-hour Schiphol layover")} />
        </div>
        <div>
          <label htmlFor="slug" className={labelClass}>{lbl(labels, "admin.articleForm.slug_label", "Slug (URL)")}</label>
          <input id="slug" name="slug" type="text" maxLength={200}
            value={slug} onChange={(e) => setSlug(e.target.value)} className={inputClass + " font-mono text-sm"}
            placeholder={lbl(labels, "admin.articleForm.slug_placeholder", "auto-generated from title")} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="excerpt" className={labelClass}>{lbl(labels, "admin.articleForm.excerpt_label", "Excerpt")}</label>
          <span className={`text-xs tabular-nums ${excerpt.length > 250 ? "text-legend-gold" : "text-warm-cream/40"}`}>{excerpt.length}/280</span>
        </div>
        <textarea id="excerpt" name="excerpt" rows={2} maxLength={280}
          value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
          className={inputClass + " resize-none"}
          placeholder={lbl(labels, "admin.articleForm.excerpt_placeholder", "One-paragraph summary shown on the /blog index card (optional)")} />
      </div>

      <div>
        <label htmlFor="body_md" className={labelClass}>{lbl(labels, "admin.articleForm.body_label", "Body (Markdown)")}</label>
        <textarea id="body_md" name="body_md" rows={20} required
          defaultValue={article?.body_md ?? ""}
          className={inputClass + " resize-y font-mono text-sm leading-relaxed"}
          placeholder={"# What to do during a 6-hour Schiphol layover\n\nStart with a walk along the canals…"} />
        <p className="mt-1 text-xs text-warm-cream/40">
          {lbl(labels, "admin.articleForm.body_hint", "GitHub-Flavoured Markdown — headings, **bold**, *italic*, `code`, tables, fenced code blocks.")}
        </p>
      </div>

      <div>
        <label htmlFor="cover_url" className={labelClass}>{lbl(labels, "admin.articleForm.cover_label", "Cover image URL")}</label>
        <input id="cover_url" name="cover_url" type="url"
          value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className={inputClass} placeholder="https://…/image.jpg" />
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={lbl(labels, "admin.articleForm.cover_alt", "Cover preview")}
            className="mt-2 rounded-xl max-h-40 object-cover border border-warm-cream/10"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>

      <fieldset className="space-y-4">
        <legend className={labelClass + " mb-2"}>{lbl(labels, "admin.articleForm.seo_legend", "Search engine snippet")}</legend>
        <p className="text-xs text-warm-cream/45 -mt-2">{lbl(labels, "admin.articleForm.seo_hint", "Leave blank to use title and excerpt automatically.")}</p>

        <div className="rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] px-4 py-3 space-y-0.5">
          <p className="text-[13px] text-[#1a0dab] truncate">{previewTitle}</p>
          <p className="text-[11px] text-warm-cream/40">layover-legends.com/blog/{slug || "…"}</p>
          <p className="text-[12px] text-warm-cream/65 line-clamp-2">{previewDesc}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="meta_title" className={labelClass}>{lbl(labels, "admin.articleForm.meta_title_label", "Meta title")}</label>
            <span className={`text-xs tabular-nums ${metaTitle.length > 60 ? "text-legend-gold" : "text-warm-cream/40"}`}>{metaTitle.length}/70</span>
          </div>
          <input id="meta_title" name="meta_title" type="text" maxLength={70}
            value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputClass}
            placeholder={`${title || "Article title"} · LayoverAmsterdam`} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="meta_description" className={labelClass}>{lbl(labels, "admin.articleForm.meta_desc_label", "Meta description")}</label>
            <span className={`text-xs tabular-nums ${metaDesc.length > 140 ? "text-legend-gold" : "text-warm-cream/40"}`}>{metaDesc.length}/160</span>
          </div>
          <textarea id="meta_description" name="meta_description" rows={2} maxLength={160}
            value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)}
            className={inputClass + " resize-none"}
            placeholder={lbl(labels, "admin.articleForm.meta_desc_placeholder", "What will readers find in this article? (auto-generated when blank)")} />
        </div>
      </fieldset>

      <label className="flex items-start gap-3 p-4 rounded-xl bg-warm-cream/5 border border-warm-cream/10 cursor-pointer hover:bg-warm-cream/[0.07] transition-colors">
        <input type="checkbox" name="is_published" defaultChecked={!!article?.is_published}
          className="mt-0.5 h-4 w-4 rounded border-warm-cream/40 bg-warm-cream/10 text-legend-gold focus:ring-legend-gold/60" />
        <span className="text-sm text-warm-cream/85">
          <span className="font-medium text-warm-cream">{lbl(labels, "admin.articleForm.published_label", "Published")}</span>
          <span className="block text-xs text-warm-cream/55 mt-0.5">
            {lbl(labels, "admin.articleForm.published_hint", "Visible on /blog and included in the sitemap. Uncheck to save as draft.")}
          </span>
        </span>
      </label>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <SaveButton mode={mode} labels={labels} />
        {mode === "edit" && deleteAction && <DeleteButton formAction={deleteAction} labels={labels} />}
        <a href="/admin/articles"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-warm-cream/20 text-warm-cream/70 hover:bg-warm-cream/5 transition-colors sm:ml-auto">
          {lbl(labels, "admin.articleForm.back", "Back to list")}
        </a>
      </div>
    </form>
  );
}
