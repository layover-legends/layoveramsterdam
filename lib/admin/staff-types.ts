// Shared types — importable from both server and "use client" files.

export type StaffRole =
  | "driver_only" | "guide_only" | "driver_guide" | "photographer"
  | "support" | "manager" | "owner"
  | "guide" | "driver" | "dispatcher" | "admin"; // legacy from earlier scaffold

export type StaffStatus = "active" | "inactive" | "suspended" | "onboarding";

export type PayoutMethod = "bank_transfer" | "cash" | "platform";

export const STAFF_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner",        label: "Owner" },
  { value: "manager",      label: "Manager" },
  { value: "driver_guide", label: "Driver + Guide" },
  { value: "driver_only",  label: "Driver only" },
  { value: "guide_only",   label: "Guide only" },
  { value: "photographer", label: "Photographer" },
  { value: "support",      label: "Support" },
];

export const STAFF_ROLES = STAFF_ROLE_OPTIONS.map((r) => r.value);
export const STAFF_STATUSES: StaffStatus[] = ["active", "onboarding", "inactive", "suspended"];

export type StaffRow = {
  id: string;
  user_id: string | null;
  city_id: string | null;
  role: string;
  status: string | null;
  certified_at: string | null;
  hourly_cents: number | null;
  notes: string | null;
  // Phase 9c operational fields
  full_name: string;
  preferred_name: string | null;
  photo_url: string | null;
  bio_short: string | null;
  bio_long: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: string | null;
  termination_date: string | null;
  hourly_rate_cents: number | null;
  daily_rate_cents: number | null;
  payout_method: string | null;
  bank_iban: string | null;
  spoken_languages: string[];
  driving_license_number: string | null;
  driving_license_expiry: string | null;
  taxi_pas_number: string | null;
  taxi_pas_expiry: string | null;
  first_aid_cert_expiry: string | null;
  background_check_date: string | null;
  background_check_expiry: string | null;
  is_active: boolean;
  max_tours_per_day: number;
  created_at: string;
  updated_at: string;
  // joined
  user_email?: string | null;
};

export type ComplianceItem = {
  entityId: string;
  entityName: string;
  entityType: "staff" | "vehicle";
  field: string;
  label: string;
  expiryDate: string;
  daysUntil: number;
};
