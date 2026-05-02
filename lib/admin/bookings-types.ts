export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "refunded"
  | "no_show";

export type BookingRow = {
  id: string;
  user_id: string | null;
  city_id: string;
  tour_id: string;
  layover_id: string | null;
  party_size: number;
  scheduled_pickup_at: string;
  scheduled_dropoff_at: string;
  base_cents: number;
  addons_cents: number;
  total_cents: number;
  currency: string;
  status: BookingStatus;
  payment_intent_id: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tour_name?: string | null;
  user_email?: string | null;
};

export const BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment", "confirmed", "in_progress", "completed", "cancelled", "refunded", "no_show",
];
