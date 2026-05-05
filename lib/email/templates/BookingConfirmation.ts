// HTML email template for booking confirmation.
// Returns { subject, html } — no React Email dependency.

export type BookingConfirmationData = {
  bookingId: string;
  tourName: string | null;
  partySize: number;
  scheduledPickupAt: string;
  addonLines: Array<{ name: string; total_cents: number; currency: string }>;
  totalCents: number;
  currency: string;
  receiptUrl: string | null;
  userEmail: string;
};

function money(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

function formatDt(iso: string) {
  return new Intl.DateTimeFormat("en-NL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

export function renderBookingConfirmation(data: BookingConfirmationData): {
  subject: string;
  html: string;
} {
  const subject = `Layover Legends · Booking confirmed — ref ${data.bookingId.slice(0, 8).toUpperCase()}`;

  const addonRows = data.addonLines
    .map(
      (a) => `
    <tr>
      <td style="padding:6px 0;color:#C9963A;">+ ${a.name}</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;">${money(a.total_cents, a.currency)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:'Outfit',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0D0D0D;border:1px solid rgba(247,243,236,0.1);border-radius:16px;overflow:hidden;max-width:100%;">

  <!-- Header -->
  <tr><td style="background:#0D0D0D;padding:32px 40px;border-bottom:1px solid rgba(247,243,236,0.1);">
    <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#C9963A;font-weight:600;">Layover Legends</p>
    <h1 style="margin:8px 0 0;font-size:28px;font-weight:600;color:#F7F3EC;line-height:1.2;">Booking confirmed ✓</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 24px;color:rgba(247,243,236,0.7);font-size:15px;line-height:1.6;">
      Great news — your Amsterdam layover experience is locked in. See you there.
    </p>

    <!-- Summary table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(247,243,236,0.1);margin-bottom:24px;">
      ${data.tourName ? `<tr>
        <td style="padding:12px 0;color:rgba(247,243,236,0.6);font-size:14px;">Tour</td>
        <td style="padding:12px 0;text-align:right;color:#F7F3EC;font-weight:500;font-size:14px;">${data.tourName}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:6px 0;color:rgba(247,243,236,0.6);font-size:14px;">Party size</td>
        <td style="padding:6px 0;text-align:right;color:#F7F3EC;font-size:14px;">${data.partySize}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(247,243,236,0.6);font-size:14px;">Pickup</td>
        <td style="padding:6px 0;text-align:right;color:#F7F3EC;font-size:14px;">${formatDt(data.scheduledPickupAt)}</td>
      </tr>
      ${addonRows}
      <tr style="border-top:1px solid rgba(247,243,236,0.1);">
        <td style="padding:16px 0 0;color:#F7F3EC;font-weight:600;font-size:16px;">Total (EUR)</td>
        <td style="padding:16px 0 0;text-align:right;color:#C9963A;font-weight:600;font-size:20px;font-family:monospace;">${money(data.totalCents, data.currency)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:6px 0 0;text-align:right;color:rgba(247,243,236,0.35);font-size:11px;">
          Charged in EUR by Stripe. Your bank may apply FX fees.
        </td>
      </tr>
    </table>

    <!-- What to bring -->
    <div style="background:rgba(247,243,236,0.04);border:1px solid rgba(247,243,236,0.1);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-weight:600;color:#F7F3EC;font-size:14px;">What to bring</p>
      <ul style="margin:0;padding:0 0 0 18px;color:rgba(247,243,236,0.7);font-size:13px;line-height:1.8;">
        <li>Passport or ID (required for airport access)</li>
        <li>Comfortable walking shoes</li>
        <li>This booking confirmation (ref below)</li>
        <li>Your layover boarding pass</li>
      </ul>
    </div>

    <!-- Meeting point -->
    <p style="color:rgba(247,243,236,0.6);font-size:14px;line-height:1.6;margin:0 0 24px;">
      <strong style="color:#F7F3EC;">Meeting point:</strong> We'll meet you at Schiphol Airport arrivals. Your guide will reach out 24h before with exact details.
    </p>

    ${data.receiptUrl ? `<a href="${data.receiptUrl}" style="display:inline-block;background:#C9963A;color:#0D0D0D;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:100px;font-size:14px;margin-bottom:24px;">View receipt →</a>` : ""}

    <!-- Ref -->
    <p style="margin:0;color:rgba(247,243,236,0.3);font-size:11px;font-family:monospace;">
      Booking ref: ${data.bookingId}
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 40px;border-top:1px solid rgba(247,243,236,0.1);">
    <p style="margin:0;font-size:12px;color:rgba(247,243,236,0.3);line-height:1.6;">
      Questions? Reply to this email.<br>
      Cancellation policy: cancel 48h before pickup for a full refund.<br>
      <a href="https://layover-legends.com" style="color:#C9963A;text-decoration:none;">layover-legends.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}
