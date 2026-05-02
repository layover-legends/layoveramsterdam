export type StaffRole = "guide" | "driver" | "dispatcher" | "support" | "manager" | "admin";
export type StaffStatus = "active" | "inactive" | "suspended" | "onboarding";

export type StaffRow = {
  id: string;
  user_id: string | null;
  city_id: string;
  role: StaffRole;
  status: StaffStatus;
  certified_at: string | null;
  hourly_cents: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string | null;
};

export const STAFF_ROLES: StaffRole[] = ["guide", "driver", "dispatcher", "support", "manager", "admin"];
export const STAFF_STATUSES: StaffStatus[] = ["active", "inactive", "suspended", "onboarding"];
