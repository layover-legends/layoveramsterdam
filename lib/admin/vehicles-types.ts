export type VehicleType = "van" | "minivan" | "bus" | "sedan" | "bike" | "electric_bike" | "scooter" | "tram_pass" | "other";
export type FuelType = "petrol" | "diesel" | "electric" | "hybrid" | "lpg" | "na";

export const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: "van",          label: "Van" },
  { value: "minivan",      label: "Minivan" },
  { value: "bus",          label: "Bus / Minibus" },
  { value: "sedan",        label: "Sedan / Car" },
  { value: "bike",         label: "Bicycle" },
  { value: "electric_bike",label: "E-Bike" },
  { value: "scooter",      label: "Scooter" },
  { value: "tram_pass",    label: "Tram pass (no vehicle)" },
  { value: "other",        label: "Other" },
];

export const FUEL_TYPE_OPTIONS: { value: FuelType; label: string }[] = [
  { value: "petrol",   label: "Petrol" },
  { value: "diesel",   label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid",   label: "Hybrid" },
  { value: "lpg",      label: "LPG" },
  { value: "na",       label: "N/A" },
];

export type VehicleRow = {
  id: string;
  nickname: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  color: string | null;
  seats: number | null;
  wheelchair_accessible: boolean | null;
  purchase_date: string | null;
  purchase_price_cents: number | null;
  odometer_km: number | null;
  apk_expiry: string | null;
  insurance_expiry: string | null;
  insurance_policy_number: string | null;
  road_tax_expiry: string | null;
  last_service_date: string | null;
  last_service_km: number | null;
  service_interval_km: number;
  fuel_type: string | null;
  fuel_card_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
