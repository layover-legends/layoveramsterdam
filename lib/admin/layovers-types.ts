export type LayoverStatus = "submitted" | "matched" | "converted" | "expired" | "cancelled";

export type LayoverRow = {
  id: string;
  user_id: string | null;
  city_id: string;
  flight_in_at: string;
  flight_out_at: string;
  arrival_terminal: string | null;
  departure_terminal: string | null;
  arrival_flight: string | null;
  departure_flight: string | null;
  party_size: number;
  has_checked_bags: boolean;
  notes: string | null;
  status: LayoverStatus;
  created_at: string;
  updated_at: string;
  user_email?: string | null;
};

export const LAYOVER_STATUSES: LayoverStatus[] = ["submitted", "matched", "converted", "expired", "cancelled"];
