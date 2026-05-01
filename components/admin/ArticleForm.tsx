"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Article } from "@/lib/admin/articles-types";

type Props = {
  article?: Article | null;
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  deleteAction?: () => void | Promise<void>;
};

const labelClass = "block text-xs uppercase tracking-wide text-brand-cream/60 mb-1";
const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:border-brand-orange/60";

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-orange text-brand-navy font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
    >
      {pending ? "Saving…" : mode === "create" ? "Create article" : "Save changes"}
    </button>
  );
}

function DeleteButton({ formAction }: { formAction: () => void | Promise<void> }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Delete this article permanently?")) e.preventDefault();
      }}
      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-red-400/40 text-red-200 hover:bg-red-400/10 transition-colors disabled:opacity-60"
    >
      Delete
    </button>
  );
}

export default function ArticleForm({ article, action, mode, deleteAction }: Props) {
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

      {/* Title + slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="title" className={labelClass}>Title</label>
          <input
            id="title" name="title" type="text" required maxLength={200}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={inputClass}
            placeholder="e.g. What to do during a 6-hour Schiphol layover"
          />
        </div>
        <div>
          <label htmlFor="slug" className={labelClass}>Slug (URL)</label>
          <input
            id="slug" name="slug" type="text" maxLength={200}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={inputClass + " font-mono text-sm"}
            placeholder="auto-generated from title"
          />
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="excerpt" className={labelClass}>Excerpt</label>
          <span className={`text-xs tabular-nums ${excerpt.length > 250 ? "text-brand-orange" : "text-brand-cream/40"}`}>
            {excerpt.length}/280
          </span>
        </div>
        <textarea
          id="excerpt" name="excerpt" rows={2} maxLength={280}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className={inputClass + " resize-none"}
          placeholder="One-paragraph summary shown on the /blog index card (optional)"
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="body_md" className={labelClass}>Body (Markdown)</label>
        <textarea
          id="body_md" name="body_md" rows={20} required
          defaultValue={article?.body_md ?? ""}
          className={inputClass + " resize-y font-mono text-sm leading-relaxed"}
          placeholder={"# What to do during a 6-hour Schiphol layover\n\nStart with a walk along the canals…"}
        />
        <p className="mt-1 text-xs text-brand-cream/40">
          GitHub-Flavoured Markdown — headings, **bold**, *italic*, `code`, tables, fenced code blocks.
        </p>
      </div>

      {/* Cover URL */}
      <div>
        <label htmlFor="cover_url" className={labelClass}>Cover image URL</label>
        <input
          id="cover_url" name="cover_url" type="url"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          className={inputClass}
          placeholder="https://…/image.jpg"
        />
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt="Cover preview"
            className="mt-2 rounded-xl max-h-40 object-cover border border-brand-cream/10"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>

      {/* SEO snippet */}
      <fieldset className="space-y-4">
        <legend className={labelClass + " mb-2"}>Search engine snippet</legend>
        <p className="text-xs text-brand-cream/45 -mt-2">Leave blank to use title and excerpt automatically.</p>

        <div className="rounded-xl border border-brand-cream/10 bg-brand-cream/[0.03] px-4 py-3 space-y-0.5">
          <p className="text-[13px] text-[#1a0dab] truncate">{previewTitle}</p>
          <p className="text-[11px] text-brand-cream/40">layover-legends.com/blog/{slug || "…"}</p>
          <p className="text-[12px] text-brand-cream/65 line-clamp-2">{previewDesc}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="meta_title" className={labelClass}>Meta title</label>
            <span className={`text-xs tabular-nums ${metaTitle.length > 60 ? "text-brand-orange" : "text-brand-cream/40"}`}>
              {metaTitle.length}/70
            </span>
          </div>
          <input
            id="meta_title" name="meta_title" type="text" maxLength={70}
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className={inputClass}
            placeholder={`${title || "Article title"} · LayoverAmsterdam`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="meta_description" className={labelClass}>Meta description</label>
            <span className={`text-xs tabular-nums ${metaDesc.length > 140 ? "text-brand-orange" : "text-brand-cream/40"}`}>
              {metaDesc.length}/160
            </span>
          </div>
          <textarea
            id="meta_description" name="meta_description" rows={2} maxLength={160}
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            className={inputClass + " resize-none"}
            placeholder="What will readers find in this article? (auto-generated when blank)"
          />
        </div>
      </fieldset>

      {/* Publish toggle */}
      <label className="flex items-start gap-3 p-4 rounded-xl bg-brand-cream/5 border border-brand-cream/10 cursor-pointer hover:bg-brand-cream/[0.07] transition-colors">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={!!article?.is_published}
          className="mt-0.5 h-4 w-4 rounded border-brand-cream/40 bg-brand-cream/10 text-brand-orange focus:ring-brand-orange/60"
        />
        <span className="text-sm text-brand-cream/85">
          <span className="font-medium text-brand-cream">Published</span>
          <span className="block text-xs text-brand-cream/55 mt-0.5">
            Visible on /blog and included in the sitemap. Uncheck to save as draft.
          </span>
        </span>
      </label>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <SaveButton mode={mode} />
        {mode === "edit" && deleteAction && <DeleteButton formAction={deleteAction} />}
        <a
          href="/admin/articles"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-brand-cream/20 text-brand-cream/70 hover:bg-brand-cream/5 transition-colors sm:ml-auto"
        >
          Back to list
        </a>
      </div>
    </form>
  );
}
