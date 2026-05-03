"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendServiceAvailableEmails } from "@/lib/email/send-service-available";

export async function getWaitlistCount(serviceId: string): Promise<number> {
  await requireAdmin();
  const admin = createAdminClient();
  const { count } = await admin
    .from("service_interest")
    .select("id", { count: "exact", head: true })
    .eq("service_id", serviceId)
    .is("notified_at", null);
  return count ?? 0;
}

export async function notifyServiceWaitlist(
  serviceId: string,
): Promise<{ sent: number; failed: number }> {
  await requireAdmin();
  const admin = createAdminClient();

  // Get service info
  const { data: serviceRow } = await admin
    .from("addons")
    .select("name, slug, short_blurb, price_cents, vat_rate")
    .eq("id", serviceId)
    .maybeSingle();

  if (!serviceRow) return { sent: 0, failed: 0 };

  const service = serviceRow as {
    name: string | null;
    slug: string;
    short_blurb: string | null;
    price_cents: number;
    vat_rate: number;
  };

  // Get un-notified recipients
  const { data: interests } = await admin
    .from("service_interest")
    .select("id, email")
    .eq("service_id", serviceId)
    .is("notified_at", null);

  const recipients = (interests ?? []) as { id: string; email: string }[];
  if (recipients.length === 0) return { sent: 0, failed: 0 };

  const { sent, failed, sentIds } = await sendServiceAvailableEmails(
    {
      name: service.name ?? service.slug,
      slug: service.slug,
      shortBlurb: service.short_blurb,
      priceCents: service.price_cents,
      currency: "EUR",
    },
    recipients,
  );

  // Mark successfully-sent rows as notified
  if (sentIds.length > 0) {
    await admin
      .from("service_interest")
      .update({ notified_at: new Date().toISOString() })
      .in("id", sentIds);
  }

  return { sent, failed };
}
