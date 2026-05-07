"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveServiceImage } from "@/app/admin/services/save-image-action";

type Props = {
  serviceId: string;
  source: "tour" | "addon";
  imageUrl: string | null;
};

/**
 * Save image only — persists the new hero image_url without going through
 * the full Save & sync to Stripe flow. Lets the admin keep their other
 * unsaved edits while locking in the photo.
 *
 * Only rendered when the in-drawer imageUrl differs from the saved row value.
 */
export default function SaveImageOnlyButton({ serviceId, source, imageUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function handleSave() {
    startTransition(async () => {
      const res = await saveServiceImage(serviceId, source, imageUrl);
      if (!res.ok) {
        alert(`Save failed: ${res.error}`);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  // Hide for ~3 seconds after a successful save to give visual confirmation
  if (savedAt && Date.now() - savedAt < 3000) {
    return (
      <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2">
        ✓ Image saved — visible on /shop and /tours immediately.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={pending}
      className="self-start px-4 py-2 rounded-lg bg-warm-cream/10 border border-warm-cream/20 text-warm-cream text-xs font-semibold hover:bg-warm-cream/15 disabled:opacity-50 transition-colors"
    >
      {pending ? "Saving image…" : "💾 Save image only (skip Stripe)"}
    </button>
  );
}
