"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TourStopRow, AddableDestination } from "@/lib/admin/tour-stops-types";
import {
  reorderTourStops,
  addStopToTour,
  removeTourStop,
  updateTourStop,
  searchDestinationsForTour,
} from "@/app/admin/tours/[id]/stops-actions";

// ─── props ────────────────────────────────────────────────────────────────────

type Props = {
  tourId: string;
  initialStops: TourStopRow[];
};

// ─── sortable row ─────────────────────────────────────────────────────────────

type RowProps = {
  stop: TourStopRow;
  menuOpen: boolean;
  editing: boolean;
  saving: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onEditToggle: () => void;
  onRemove: () => void;
  onSaveFields: (fields: { is_optional: boolean; duration_override: number | null; notes: string | null }) => void;
};

function SortableStopRow({
  stop,
  menuOpen,
  editing,
  saving,
  onMenuToggle,
  onMenuClose,
  onEditToggle,
  onRemove,
  onSaveFields,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const menuRef = useRef<HTMLDivElement>(null);
  const [localOptional, setLocalOptional] = useState(stop.is_optional);
  const [localDuration, setLocalDuration] = useState(
    stop.duration_override !== null ? String(stop.duration_override) : "",
  );
  const [localNotes, setLocalNotes] = useState(stop.notes ?? "");

  // Sync when stop prop changes after server refresh.
  useEffect(() => {
    setLocalOptional(stop.is_optional);
    setLocalDuration(stop.duration_override !== null ? String(stop.duration_override) : "");
    setLocalNotes(stop.notes ?? "");
  }, [stop.is_optional, stop.duration_override, stop.notes]);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, onMenuClose]);

  const d = stop.destination;
  const catLabel = d.category_slug
    ? d.category_slug.replace(/-/g, " ")
    : null;

  function handleSave() {
    const dur = localDuration.trim() ? Number(localDuration) : null;
    onSaveFields({
      is_optional: localOptional,
      duration_override: dur && !Number.isNaN(dur) ? dur : null,
      notes: localNotes.trim() || null,
    });
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        className={
          "flex items-start gap-3 px-3 py-3 rounded-xl border transition-colors " +
          (isDragging
            ? "border-brand-orange/40 bg-brand-orange/5"
            : "border-brand-cream/10 bg-brand-cream/[0.03] hover:bg-brand-cream/[0.06]")
        }
      >
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing text-brand-cream/30 hover:text-brand-cream/60 touch-none"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.2" />
            <circle cx="11" cy="4" r="1.2" />
            <circle cx="5" cy="8" r="1.2" />
            <circle cx="11" cy="8" r="1.2" />
            <circle cx="5" cy="12" r="1.2" />
            <circle cx="11" cy="12" r="1.2" />
          </svg>
        </button>

        {/* Thumbnail */}
        {d.primary_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.primary_photo_url}
            alt=""
            className="w-10 h-10 rounded-lg object-cover border border-brand-cream/10 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-brand-cream/5 border border-brand-cream/10 flex-shrink-0 flex items-center justify-center text-brand-cream/20 text-xs">
            {d.name.charAt(0)}
          </div>
        )}

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-brand-cream truncate">{d.name}</span>
            {stop.is_optional && (
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-cream/10 text-brand-cream/60">
                Optional
              </span>
            )}
            {catLabel && (
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-brand-orange/10 text-brand-orange/80">
                {catLabel}
              </span>
            )}
          </div>
          {d.area && (
            <p className="text-xs text-brand-cream/50 mt-0.5">{d.area}</p>
          )}

          {/* Inline edit panel */}
          {editing && (
            <div className="mt-3 space-y-3 border-t border-brand-cream/10 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localOptional}
                  onChange={(e) => setLocalOptional(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-cream/40 bg-brand-cream/10 text-brand-orange focus:ring-brand-orange/60"
                />
                <span className="text-xs text-brand-cream/80">Mark as optional stop</span>
              </label>
              <div>
                <label className="block text-xs text-brand-cream/55 mb-1">
                  Duration override (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={localDuration}
                  onChange={(e) => setLocalDuration(e.target.value)}
                  placeholder="Default from destination"
                  className="w-full sm:w-40 px-3 py-1.5 rounded-lg bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/25 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/60"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-cream/55 mb-1">
                  Notes (max 500 chars)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Guide notes for this stop…"
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/25 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/60"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-full bg-brand-orange text-brand-navy text-xs font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={onEditToggle}
                  className="px-3 py-1.5 rounded-full border border-brand-cream/20 text-brand-cream/60 text-xs hover:bg-brand-cream/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Duration badge (read mode) */}
        {!editing && stop.duration_override !== null && (
          <span className="flex-shrink-0 text-xs text-brand-cream/50 tabular-nums mt-0.5">
            {stop.duration_override}m
          </span>
        )}

        {/* Three-dot menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Stop options"
            className="p-1 rounded-lg text-brand-cream/40 hover:text-brand-cream/80 hover:bg-brand-cream/5 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.3" />
              <circle cx="8" cy="8" r="1.3" />
              <circle cx="8" cy="13" r="1.3" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-40 rounded-xl border border-brand-cream/15 bg-brand-navy shadow-xl py-1">
              <button
                type="button"
                onClick={() => { onMenuClose(); onEditToggle(); }}
                className="w-full text-left px-4 py-2 text-sm text-brand-cream/80 hover:bg-brand-cream/5 transition-colors"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={() => {
                  onMenuClose();
                  if (confirm(`Remove "${d.name}" from this tour?`)) onRemove();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-400/10 transition-colors"
              >
                Remove stop
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main editor ──────────────────────────────────────────────────────────────

export default function TourStopsEditor({ tourId, initialStops }: Props) {
  const router = useRouter();
  const [stops, setStops] = useState<TourStopRow[]>(initialStops);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [editingStop, setEditingStop] = useState<string | null>(null);
  const [savingStop, setSavingStop] = useState<string | null>(null);

  // Picker state
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<AddableDestination[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync server state changes (e.g. after router.refresh()).
  useEffect(() => {
    setStops(initialStops);
  }, [initialStops]);

  // Close picker on outside click.
  useEffect(() => {
    if (!pickerOpen) return;
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  // Debounced picker search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPickerLoading(true);
      const results = await searchDestinationsForTour(tourId, pickerQuery);
      setPickerResults(results);
      setPickerLoading(false);
      setPickerOpen(results.length > 0 || pickerQuery.trim().length > 0);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerQuery, tourId]);

  // ── dnd-kit setup ────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setMenuOpenFor(null);
    setEditingStop(null);
    // Suppress the active id highlight — just show ghost via opacity
    void active;
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(stops, oldIndex, newIndex);

    setStops(reordered); // optimistic
    setSaving(true);
    setError(null);

    const result = await reorderTourStops(tourId, reordered.map((s) => s.id));
    setSaving(false);

    if (!result.ok) {
      setStops(stops); // revert
      setError(result.error);
    }
  }

  // ── add stop ─────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async (dest: AddableDestination) => {
    setPickerOpen(false);
    setPickerQuery("");
    setPickerResults([]);
    setSaving(true);
    setError(null);

    const result = await addStopToTour(tourId, dest.id);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }, [tourId, router]);

  // ── remove stop ──────────────────────────────────────────────────────────

  const handleRemove = useCallback(async (tourStopId: string) => {
    setSaving(true);
    setError(null);

    const result = await removeTourStop(tourStopId, tourId);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
    } else {
      setStops((prev) => prev.filter((s) => s.id !== tourStopId));
      router.refresh();
    }
  }, [tourId, router]);

  // ── update stop fields ───────────────────────────────────────────────────

  const handleSaveFields = useCallback(async (
    tourStopId: string,
    fields: { is_optional: boolean; duration_override: number | null; notes: string | null },
  ) => {
    setSavingStop(tourStopId);
    setError(null);

    const result = await updateTourStop(tourStopId, tourId, fields);
    setSavingStop(null);

    if (!result.ok) {
      setError(result.error);
    } else {
      setEditingStop(null);
      router.refresh();
    }
  }, [tourId, router]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-200/60 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <p className="text-xs text-brand-cream/50">Saving…</p>
      )}

      {/* Draggable stop list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {stops.length === 0 ? (
              <p className="text-sm text-brand-cream/50 py-6 text-center">
                No stops yet. Add your first stop below.
              </p>
            ) : (
              stops.map((stop) => (
                <SortableStopRow
                  key={stop.id}
                  stop={stop}
                  menuOpen={menuOpenFor === stop.id}
                  editing={editingStop === stop.id}
                  saving={savingStop === stop.id}
                  onMenuToggle={() =>
                    setMenuOpenFor((prev) => (prev === stop.id ? null : stop.id))
                  }
                  onMenuClose={() => setMenuOpenFor(null)}
                  onEditToggle={() =>
                    setEditingStop((prev) => (prev === stop.id ? null : stop.id))
                  }
                  onRemove={() => handleRemove(stop.id)}
                  onSaveFields={(fields) => handleSaveFields(stop.id, fields)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add-stop picker */}
      <div className="relative" ref={pickerRef}>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            onFocus={() => {
              if (pickerResults.length > 0) setPickerOpen(true);
            }}
            placeholder="Search destinations to add…"
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream placeholder:text-brand-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/60 disabled:opacity-50 text-sm"
          />
          {pickerLoading && (
            <span className="text-xs text-brand-cream/40">Searching…</span>
          )}
        </div>

        {pickerOpen && pickerResults.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-brand-cream/15 bg-brand-navy shadow-xl overflow-hidden max-h-72 overflow-y-auto">
            {pickerResults.map((dest) => (
              <li key={dest.id}>
                <button
                  type="button"
                  onClick={() => handleAdd(dest)}
                  className="w-full text-left px-4 py-2.5 hover:bg-brand-cream/5 transition-colors"
                >
                  <span className="text-sm text-brand-cream">{dest.name}</span>
                  {dest.area && (
                    <span className="text-xs text-brand-cream/45 ml-2">{dest.area}</span>
                  )}
                  {dest.category_slug && (
                    <span className="text-[10px] text-brand-orange/70 ml-2 uppercase tracking-wide">
                      {dest.category_slug.replace(/-/g, " ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {pickerOpen && pickerResults.length === 0 && pickerQuery.trim() && !pickerLoading && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-brand-cream/10 bg-brand-navy shadow-xl px-4 py-3 text-sm text-brand-cream/50">
            No destinations match "{pickerQuery}" (already added or not found).
          </div>
        )}
      </div>

      {/* No-JS fallback form (hidden when JS is active) */}
      <noscript>
        <form method="post" className="flex gap-2">
          <input
            type="text"
            name="q"
            placeholder="Search by name…"
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-cream/5 border border-brand-cream/15 text-brand-cream"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-brand-orange text-brand-navy font-semibold"
          >
            Search
          </button>
        </form>
      </noscript>
    </div>
  );
}
