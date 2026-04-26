// Client-safe types and category metadata for free stops.
// This file MUST NOT import any server-only modules — it is reachable
// from "use client" components.

export type FreeStopCategory =
  | "monuments"
  | "canals"
  | "neighborhoods"
  | "food"
  | "bars"
  | "architecture"
  | "experiences"
  | "hidden_gems"
  | "shopping"
  | "nature"
  | "religion";

export type FreeStop = {
  id: string;
  name: string;
  neighborhood: string | null;
  description: string | null;
  category: FreeStopCategory;
  lat: number | null;
  lng: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export const CATEGORY_META: Record<
  FreeStopCategory,
  { label: string; emoji: string }
> = {
  monuments: { label: "Monuments & Landmarks", emoji: "🏛️" },
  canals: { label: "Canaux & Scènes de rue", emoji: "🚤" },
  neighborhoods: { label: "Quartiers à explorer", emoji: "🏘️" },
  food: { label: "Food & Marchés", emoji: "🥯" },
  bars: { label: "Bars & Cafés", emoji: "🍻" },
  architecture: { label: "Architecture & Design", emoji: "📐" },
  experiences: { label: "Expériences & Transport", emoji: "⛴️" },
  hidden_gems: { label: "Pépites cachées", emoji: "💎" },
  shopping: { label: "Shopping local", emoji: "🛍️" },
  nature: { label: "Nature & Parcs", emoji: "🌳" },
  religion: { label: "Spiritualité & Religion", emoji: "⛪" },
};

export const ALL_CATEGORIES: FreeStopCategory[] = Object.keys(
  CATEGORY_META,
) as FreeStopCategory[];
