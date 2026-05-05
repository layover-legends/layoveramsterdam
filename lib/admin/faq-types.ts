export type FaqCategory =
  | "booking" | "payment" | "cancellation" | "tours" | "logistics"
  | "safety" | "accessibility" | "after_dark" | "business" | "other";

export const FAQ_CATEGORIES: { value: FaqCategory; label: string }[] = [
  { value: "booking",       label: "Booking" },
  { value: "payment",       label: "Payment" },
  { value: "cancellation",  label: "Cancellation" },
  { value: "tours",         label: "Tours" },
  { value: "logistics",     label: "Logistics" },
  { value: "safety",        label: "Safety" },
  { value: "accessibility", label: "Accessibility" },
  { value: "after_dark",    label: "After Dark" },
  { value: "business",      label: "Business" },
  { value: "other",         label: "Other" },
];

export type FaqRow = {
  id: string;
  category: FaqCategory;
  sort_order: number;
  is_active: boolean;
  question: string;
  answer: string;
  source_lang: string;
  created_at: string;
  updated_at: string;
};
