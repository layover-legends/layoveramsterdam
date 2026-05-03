/**
 * Email template for account deletion flow.
 * Two variants: pre-deletion warning and post-deletion confirmation.
 */

export function renderDeletionWarning(email: string): { subject: string; html: string } {
  const subject = "Layover Legends — Account deletion requested";
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:'Outfit',Arial,sans-serif;color:#F7F3EC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(247,243,236,0.1);border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:1px solid rgba(247,243,236,0.08);">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9963A;font-weight:600;">LAYOVER LEGENDS</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#F7F3EC;line-height:1.3;">Account deletion requested</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(247,243,236,0.75);">
              We received a request to permanently delete the Layover Legends account associated with <strong style="color:#F7F3EC;">${email}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:rgba(247,243,236,0.75);">
              Your account and personal data will be deleted within the next few minutes. Booking records will be anonymised and retained for 7 years as required by Dutch tax law.
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:rgba(247,243,236,0.50);">
              If you did not make this request, please contact us immediately at <a href="mailto:travellayoverlegends@gmail.com" style="color:#C9963A;">travellayoverlegends@gmail.com</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(247,243,236,0.08);font-size:12px;color:rgba(247,243,236,0.35);">
            Layover Legends · Amsterdam · <a href="https://layover-legends.com/legal/privacy" style="color:rgba(247,243,236,0.35);">Privacy Policy</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

export function renderDeletionConfirmation(email: string): { subject: string; html: string } {
  const subject = "Layover Legends — Your account has been deleted";
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:'Outfit',Arial,sans-serif;color:#F7F3EC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(247,243,236,0.1);border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:1px solid rgba(247,243,236,0.08);">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9963A;font-weight:600;">LAYOVER LEGENDS</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#F7F3EC;line-height:1.3;">Your account has been deleted</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(247,243,236,0.75);">
              The Layover Legends account for <strong style="color:#F7F3EC;">${email}</strong> has been permanently deleted.
            </p>
            <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:2;color:rgba(247,243,236,0.70);">
              <li>Your profile and personal data have been erased (GDPR Art. 17)</li>
              <li>Booking records have been anonymised and are retained for Dutch tax compliance (7 years)</li>
              <li>You will not receive further emails from us</li>
            </ul>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:rgba(247,243,236,0.50);">
              Questions? Contact us at <a href="mailto:travellayoverlegends@gmail.com" style="color:#C9963A;">travellayoverlegends@gmail.com</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(247,243,236,0.08);font-size:12px;color:rgba(247,243,236,0.35);">
            Layover Legends · Amsterdam
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
