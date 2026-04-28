"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { useRef, useState } from "react";
import type { Photo } from "@/lib/admin/stops-types";

type Props = {
  destinationId: string;
  photos: Photo[];
  addAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (photoId: string, formData: FormData) => void | Promise<void>;
  primaryAction: (photoId: string, formData: FormData) => void | Promise<void>;
};

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-brand-orange text-brand-navy font-semibold shadow hover:shadow-lg transition-all disabled:opacity-60"
    >
      {pending ? "Uploading…" : "Upload"}
    </button>
  );
}

export default function PhotoManager({
  destinationId,
  photos,
  addAction,
  deleteAction,
  primaryAction,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.length === 0 ? (
          <div className="col-span-full text-sm text-brand-cream/55 italic">
            No photos yet — add one below.
          </div>
        ) : (
          photos.map((p) => {
            const deleteWithId = deleteAction.bind(null, p.id);
            const primaryWithId = primaryAction.bind(null, p.id);
            return (
              <div
                key={p.id}
                className={
                  "relative rounded-xl overflow-hidden border " +
                  (p.is_primary
                    ? "border-brand-orange/60 ring-2 ring-brand-orange/30"
                    : "border-brand-cream/15")
                }
              >
                <div className="relative aspect-square bg-brand-cream/5">
                  <Image
                    src={p.url}
                    alt={p.alt_text ?? ""}
                    fill
                    sizes="200px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                {p.is_primary && (
                  <span className="absolute top-2 left-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-brand-orange text-brand-navy font-semibold">
                    Primary
                  </span>
                )}
                <div className="flex">
                  {!p.is_primary && (
                    <form action={primaryWithId} className="flex-1">
                      <button
                        type="submit"
                        className="w-full px-2 py-1.5 text-[11px] text-brand-cream/80 hover:bg-brand-cream/10 transition-colors border-t border-brand-cream/10"
                      >
                        Make primary
                      </button>
                    </form>
                  )}
                  <form action={deleteWithId} className="flex-1">
                    <button
                      type="submit"
                      onClick={(e) => {
                        if (!confirm("Delete this photo?")) e.preventDefault();
                      }}
                      className="w-full px-2 py-1.5 text-[11px] text-red-200 hover:bg-red-400/10 transition-colors border-t border-brand-cream/10"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={addAction} className="rounded-xl border border-dashed border-brand-cream/20 bg-brand-cream/[0.03] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden border border-brand-cream/15 bg-brand-cream/5 flex items-center justify-center flex-shrink-0">
          {preview ? (
            <Image
              src={preview}
              alt="Preview"
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-[10px] text-brand-cream/40">No file</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPreview(URL.createObjectURL(f));
                setFileName(f.name);
              } else {
                setPreview(null);
                setFileName(null);
              }
            }}
            className="block text-sm text-brand-cream/80 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-brand-orange/15 file:text-brand-orange hover:file:bg-brand-orange/25 file:cursor-pointer"
          />
          <p className="text-xs text-brand-cream/40">
            {fileName ?? "JPEG / PNG / WebP / GIF · up to 5 MB"}
          </p>
        </div>
        <UploadButton />
      </form>
    </div>
  );
}
