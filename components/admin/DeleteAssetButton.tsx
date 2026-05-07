"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePhotos } from "@/app/admin/photos/delete-action";

type Props = {
  photoId: string;
  /** If > 0 the button shows a stronger warning before delete is allowed */
  usageCount?: number;
};

export default function DeleteAssetButton({ photoId, usageCount = 0 }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deletePhotos([photoId]);
      if (!res.ok) {
        alert(`Delete failed: ${res.error}`);
        setConfirm(false);
        return;
      }
      router.push("/admin/assets");
      router.refresh();
    });
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="px-4 py-1.5 rounded-lg bg-red-500/10 border border-red-400/30 text-red-300 text-xs font-semibold hover:bg-red-500/20 transition-colors"
      >
        🗑 Delete photo
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/40">
      <span className="text-xs text-red-200">
        {usageCount > 0
          ? `Used in ${usageCount} place${usageCount !== 1 ? "s" : ""} — those references will become broken images. Continue?`
          : "Permanently delete this photo and all its variants?"}
      </span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="px-3 py-1 rounded-md bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        disabled={pending}
        className="px-3 py-1 rounded-md border border-warm-cream/15 text-warm-cream/70 text-xs hover:bg-warm-cream/5"
      >
        Cancel
      </button>
    </div>
  );
}
