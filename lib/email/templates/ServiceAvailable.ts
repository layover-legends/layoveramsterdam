// HTML email template for "service is now available" waitlist notifications.

export type ServiceAvailableData = {
  serviceName: string;
  serviceSlug: string;
  shortBlurb: string | null;
  priceCents: number;
  currency: string;
};

function money(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

export function renderServiceAvailable(data: ServiceAvailableData): {
  subject: string;
  html: string;
} {
  const subject = `Layover Legends · ${data.serviceName} is now available`;
  const shopUrl = `https://layover-legends.com/shop/${data.serviceSlug}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:'Outfit',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0D0D0D;border:1px solid rgba(247,243,236,0.1);border-radius:16px;overflow:hidden;max-width:100%;">

  <tr><td style="padding:32px 40px;border-bottom:1px solid rgba(247,243,236,0.1);">
    <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#C9963A;font-weight:600;">Layover Legends</p>
    <h1 style="margin:8px 0 0;font-size:26px;font-weight:600;color:#F7F3EC;line-height:1.2;">${data.serviceName} is live</h1>
  </td></tr>

  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 16px;color:rgba(247,243,236,0.7);font-size:15px;line-height:1.6;">
      You joined the waitlist for <strong style="color:#F7F3EC;">${data.serviceName}</strong>. It's now available.
    </p>
    ${data.shortBlurb ? `<p style="margin:0 0 24px;color:rgba(247,243,236,0.6);font-size:14px;line-height:1.6;">${data.shortBlurb}</p>` : ""}
    <p style="margin:0 0 28px;color:#C9963A;font-size:22px;font-weight:600;font-family:monospace;">${money(data.priceCents, data.currency)}</p>
    <a href="${shopUrl}" style="display:inline-block;background:#C9963A;color:#0D0D0D;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;">Buy now →</a>
  </td></tr>

  <tr><td style="padding:20px 40px;border-top:1px solid rgba(247,243,236,0.1);">
    <p style="margin:0;font-size:11px;color:rgba(247,243,236,0.25);line-height:1.6;">
      You received this because you joined the waitlist at <a href="https://layover-legends.com" style="color:#C9963A;text-decoration:none;">layover-legends.com</a>.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}
