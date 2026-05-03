function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

type Props = {
  stripeProductId: string | null;
  stripeSyncedAt: string | null;
  stripeSyncError: string | null;
  updatedAt: string | null;
};

export default function SyncStatusBadge({
  stripeProductId,
  stripeSyncedAt,
  stripeSyncError,
  updatedAt,
}: Props) {
  const isSynced =
    stripeProductId &&
    stripeSyncedAt &&
    (!updatedAt || new Date(updatedAt) <= new Date(stripeSyncedAt));

  if (isSynced) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        ✓ {relTime(stripeSyncedAt!)}
      </span>
    );
  }

  if (stripeSyncError) {
    return (
      <span
        title={stripeSyncError}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20 cursor-help"
      >
        ⚠ Error
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-400/10 text-amber-300 border-amber-400/20">
      ⚠ Out of sync
    </span>
  );
}
