import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ComplianceItem } from "@/lib/admin/staff-types";

type VehicleComplianceRow = {
  id: string;
  nickname: string;
  apk_expiry: string | null;
  insurance_expiry: string | null;
  road_tax_expiry: string | null;
};

type StaffComplianceRow = {
  id: string;
  full_name: string;
  driving_license_expiry: string | null;
  taxi_pas_expiry: string | null;
  first_aid_cert_expiry: string | null;
  background_check_expiry: string | null;
};

export type ComplianceSummary = {
  expired: ComplianceItem[];
  critical: ComplianceItem[];   // <30 days
  warning: ComplianceItem[];    // 30–90 days
  ok: ComplianceItem[];         // 90+ days
  total: number;
};

function daysUntil(dateStr: string): number {
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getComplianceSummary(): Promise<ComplianceSummary> {
  const supabase = createClient();

  const [staffRes, vehicleRes] = await Promise.all([
    supabase
      .from("staff")
      .select("id, full_name, driving_license_expiry, taxi_pas_expiry, first_aid_cert_expiry, background_check_expiry")
      .eq("is_active", true),
    supabase
      .from("vehicles")
      .select("id, nickname, apk_expiry, insurance_expiry, road_tax_expiry")
      .eq("is_active", true),
  ]);

  if (staffRes.error) throw staffRes.error;
  if (vehicleRes.error) throw vehicleRes.error;

  const items: ComplianceItem[] = [];

  const staffFields: { field: keyof StaffComplianceRow; label: string }[] = [
    { field: "driving_license_expiry", label: "Driving license" },
    { field: "taxi_pas_expiry",        label: "Taxi PAS" },
    { field: "first_aid_cert_expiry",  label: "First-aid cert" },
    { field: "background_check_expiry",label: "Background check" },
  ];

  for (const row of (staffRes.data ?? []) as StaffComplianceRow[]) {
    for (const { field, label } of staffFields) {
      const date = row[field];
      if (!date) continue;
      items.push({
        entityId: row.id,
        entityName: row.full_name || "Unnamed staff",
        entityType: "staff",
        field,
        label,
        expiryDate: date,
        daysUntil: daysUntil(date),
      });
    }
  }

  const vehicleFields: { field: keyof VehicleComplianceRow; label: string }[] = [
    { field: "apk_expiry",       label: "APK (vehicle inspection)" },
    { field: "insurance_expiry", label: "Insurance" },
    { field: "road_tax_expiry",  label: "Road tax (wegenbelasting)" },
  ];

  for (const row of (vehicleRes.data ?? []) as VehicleComplianceRow[]) {
    for (const { field, label } of vehicleFields) {
      const date = row[field as keyof VehicleComplianceRow] as string | null;
      if (!date) continue;
      items.push({
        entityId: row.id,
        entityName: row.nickname || "Unnamed vehicle",
        entityType: "vehicle",
        field: field as string,
        label,
        expiryDate: date,
        daysUntil: daysUntil(date),
      });
    }
  }

  return {
    expired:  items.filter((i) => i.daysUntil < 0).sort((a, b) => a.daysUntil - b.daysUntil),
    critical: items.filter((i) => i.daysUntil >= 0 && i.daysUntil < 30).sort((a, b) => a.daysUntil - b.daysUntil),
    warning:  items.filter((i) => i.daysUntil >= 30 && i.daysUntil < 90).sort((a, b) => a.daysUntil - b.daysUntil),
    ok:       items.filter((i) => i.daysUntil >= 90).sort((a, b) => a.daysUntil - b.daysUntil),
    total:    items.length,
  };
}
