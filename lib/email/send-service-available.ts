import "server-only";

import { Resend } from "resend";
import { renderServiceAvailable } from "./templates/ServiceAvailable";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

type Recipient = {
  email: string;
  id: string; // service_interest.id
};

type ServiceInfo = {
  name: string;
  slug: string;
  shortBlurb: string | null;
  priceCents: number;
  currency: string;
};

export async function sendServiceAvailableEmails(
  service: ServiceInfo,
  recipients: Recipient[],
): Promise<{ sent: number; failed: number; sentIds: string[] }> {
  const { subject, html } = renderServiceAvailable({
    serviceName: service.name,
    serviceSlug: service.slug,
    shortBlurb: service.shortBlurb,
    priceCents: service.priceCents,
    currency: service.currency,
  });

  let sent = 0;
  let failed = 0;
  const sentIds: string[] = [];

  // Send in batches of 10 to respect Resend rate limits
  for (const recipient of recipients) {
    try {
      await getResend().emails.send({
        from: "Layover Legends <noreply@layover-legends.com>",
        to: recipient.email,
        subject,
        html,
      });
      sent++;
      sentIds.push(recipient.id);
    } catch (err) {
      console.error("[sendServiceAvailable] failed for", recipient.email, err);
      failed++;
    }
  }

  return { sent, failed, sentIds };
}
