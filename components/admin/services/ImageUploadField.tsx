"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  source: "tour" | "addon";
  slug: string;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
};

export default function ImageUploadField({ source, slug, currentUrl, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED.includes(file.type)) {
      setError("JPEG, PNG, or WebP only");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Max 5 MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    // Use slug if available, otherwise timestamp-based path for new services
    const dir = slug.trim() || `_new_${Date.now()}`;
    const path = `${source}s/${dir}/main.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("service-images")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("service-images").getPublicUrl(path);

    onChange(publicUrl);
    setUploading(false);
  }

  function handleRemove() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-warm-cream/15 overflow-hidden">
      {currentUrl ? (
        <div className="relative">
          <Image
            src={currentUrl}
            alt="Service image"
            width={400}
            height={225}
            className="w-full object-cover aspect-video"
            unoptimized
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-ink-black/80 border border-red-400/40 text-red-400 text-xs hover:bg-red-400/15 transition-colors"
          >
            Remove
          </button>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center gap-2 p-6 cursor-pointer text-center transition-colors ${
            uploading
              ? "bg-warm-cream/5 cursor-not-allowed"
              : "bg-warm-cream/[0.03] hover:bg-warm-cream/[0.06]"
          }`}
        >
          <span className="text-2xl">{uploading ? "⏳" : "🖼"}</span>
          <span className="text-sm text-warm-cream/60">
            {uploading ? "Uploading…" : "Click to upload image"}
          </span>
          <span className="text-[10px] text-warm-cream/30">
            JPEG · PNG · WebP · max 5 MB · recommended 1200×800 px
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}
      {error && (
        <p className="px-4 py-2 text-xs text-red-400 bg-red-400/5 border-t border-red-400/15">
          {error}
        </p>
      )}
    </div>
  );
}
