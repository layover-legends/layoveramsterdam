"use client";

import { useState, useRef } from "react";

const SOURCE_OPTIONS = [
  "tour","staff","vehicle","destination","about","marketing","review"
];

type Props = { labels: Record<string, string> };

type FileEntry = {
  file: File;
  preview: string;
  altText: string;
  tags: string;
  source: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

export default function AssetUploadForm({ labels }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(newFiles: File[]) {
    const entries: FileEntry[] = newFiles.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      altText: "",
      tags: "",
      source: "marketing",
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...entries]);
  }

  function updateEntry(idx: number, patch: Partial<FileEntry>) {
    setFiles((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }

  function applyAllSource(source: string) {
    setFiles((prev) => prev.map((e) => ({ ...e, source })));
  }

  async function uploadAll() {
    const invalid = files.filter((f) => !f.altText.trim() && f.status === "pending");
    if (invalid.length > 0) {
      alert(`Please add alt text to all ${invalid.length} photo(s) before uploading.`);
      return;
    }
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") continue;
      updateEntry(i, { status: "uploading" });
      try {
        const fd = new FormData();
        fd.append("file", files[i].file);
        fd.append("alt_text", files[i].altText);
        fd.append("source", files[i].source);
        fd.append("tags", files[i].tags);

        const res = await fetch("/api/admin/upload-photo", { method: "POST", body: fd });
        if (!res.ok) throw new Error(await res.text());
        updateEntry(i, { status: "done" });
      } catch (err) {
        updateEntry(i, { status: "error", error: String(err) });
      }
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
        }}
        className="rounded-2xl border-2 border-dashed border-warm-cream/20 hover:border-legend-gold/40 p-10 text-center cursor-pointer transition-colors space-y-3">
        <p className="text-4xl">🖼</p>
        <p className="text-warm-cream/70 text-sm">Drag & drop photos here, or click to select</p>
        <p className="text-xs text-warm-cream/40">JPEG, PNG, WebP, AVIF, HEIC — up to 20MB each</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))} />
      </div>

      {files.length > 0 && (
        <>
          {/* Bulk actions */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-warm-cream/60">Apply to all:</span>
            <select onChange={(e) => applyAllSource(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs"
              style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
              <option value="" style={{ backgroundColor: "#0D0D0D" }}>Source…</option>
              {SOURCE_OPTIONS.map((o) => <option key={o} value={o} style={{ backgroundColor: "#0D0D0D" }}>{o}</option>)}
            </select>
          </div>

          {/* File list */}
          <div className="space-y-3">
            {files.map((entry, idx) => (
              <div key={entry.preview}
                className={`rounded-2xl border p-4 flex gap-4 items-start ${
                  entry.status === "done"     ? "border-emerald-400/20 bg-emerald-400/5" :
                  entry.status === "error"    ? "border-red-400/20 bg-red-400/5" :
                  entry.status === "uploading"? "border-legend-gold/20 bg-legend-gold/5" :
                  "border-warm-cream/10 bg-warm-cream/3"
                }`}>
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.preview} alt=""
                  className="w-20 h-14 object-cover rounded-xl shrink-0" />

                {/* Fields */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="space-y-1">
                    <label className="text-xs text-warm-cream/50">Alt text <span className="text-red-400">*</span></label>
                    <input type="text" value={entry.altText}
                      onChange={(e) => updateEntry(idx, { altText: e.target.value })}
                      placeholder="Describe the image for screen readers…"
                      className="w-full px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/25 text-xs focus:outline-none focus:ring-1 focus:ring-legend-gold/40" />
                  </div>
                  <div className="flex gap-2">
                    <select value={entry.source}
                      onChange={(e) => updateEntry(idx, { source: e.target.value })}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream text-xs"
                      style={{ backgroundColor: "#0D0D0D", color: "#F7F3EC" }}>
                      {SOURCE_OPTIONS.map((o) => <option key={o} value={o} style={{ backgroundColor: "#0D0D0D" }}>{o}</option>)}
                    </select>
                    <input type="text" value={entry.tags}
                      onChange={(e) => updateEntry(idx, { tags: e.target.value })}
                      placeholder="Tags (comma-sep)"
                      className="flex-1 px-2 py-1.5 rounded-lg bg-warm-cream/5 border border-warm-cream/15 text-warm-cream placeholder:text-warm-cream/25 text-xs" />
                  </div>
                </div>

                {/* Status */}
                <div className="shrink-0 text-right space-y-1">
                  {entry.status === "done"      && <p className="text-xs text-emerald-400">✓ Done</p>}
                  {entry.status === "uploading" && <p className="text-xs text-legend-gold">Uploading…</p>}
                  {entry.status === "error"     && <p className="text-xs text-red-300">{entry.error}</p>}
                  {entry.status === "pending"   && (
                    <button onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-warm-cream/30 hover:text-warm-cream/60">✕ Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={uploadAll} disabled={uploading || files.every((f) => f.status !== "pending")}
            className="w-full px-6 py-3.5 rounded-2xl bg-legend-gold text-ink-black font-bold text-sm hover:bg-gold-light disabled:opacity-50 transition-colors">
            {uploading ? "Uploading…" : `Upload ${files.filter((f) => f.status === "pending").length} photo(s)`}
          </button>
        </>
      )}
    </div>
  );
}
