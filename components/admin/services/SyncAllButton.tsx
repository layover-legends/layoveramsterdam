"use client";

import { useState, useTransition } from "react";
import { syncAllToStripe } from "@/app/actions/sync-stripe";

type Props = {
  outOfSyncCount: number;
};

export default function SyncAllButton({ outOfSyncCount }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    synced: number;
    failed: number;
    unchanged: number;
  } | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const r = await syncAllToStripe();
      setResult({ synced: r.synced, failed: r.failed, unchanged: r.unchanged });
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={pending}
        className="px-4 py-2 rounded-lg border border-legend-gold/30 text-legend-gold text-xs font-medium hover:bg-legend-gold/10 transition-colors disabled:opacity-50"
      >
        {pending ? "Syncing…" : `↻ Sync all to Stripe`}
        {!pending && outOfSyncCount > 0 && (
          <span className="ml-1.5 bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full text-[9px]">
            {outOfSyncCount}
          </span>
        )}
      </button>

      {result && !pending && (
        <p className={`text-xs ${result.failed > 0 ? "text-amber-300" : "text-emerald-400"}`}>
          {result.synced > 0 && `Synced ${result.synced}`}
          {result.unchanged > 0 && `${result.synced > 0 ? ", " : ""}${result.unchanged} unchanged`}
          {result.failed > 0 && ` — ${result.failed} failed`}
        </p>
      )}
    </div>
  );
}
