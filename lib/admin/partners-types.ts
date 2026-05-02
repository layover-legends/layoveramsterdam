export type PartnerType = "hotel" | "lounge" | "agency" | "airline" | "other";
export type PartnerStatus = "pending" | "active" | "paused" | "rejected";

export type PartnerRow = {
  id: string;
  city_id: string;
  slug: string;
  name: string;
  type: PartnerType;
  contact_email: string | null;
  commission_bps: number;
  status: PartnerStatus;
  created_at: string;
  updated_at: string;
};

export const PARTNER_TYPES: PartnerType[] = ["hotel", "lounge", "agency", "airline", "other"];
export const PARTNER_STATUSES: PartnerStatus[] = ["pending", "active", "paused", "rejected"];
