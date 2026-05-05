export type ReviewRequestData = {
  userEmail: string;
  userName: string;
  tourName: string;
  bookingRef: string;
  reviewUrl: string;
};

export function renderReviewRequest(data: ReviewRequestData): { subject: string; html: string } {
  const subject = `How was ${data.tourName}? — Leave a quick review`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:'Outfit',Arial,sans-serif;color:#F7F3EC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(247,243,236,0.1);border-radius:16px;max-width:560px;width:100%;">
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:1px solid rgba(247,243,236,0.08);">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9963A;font-weight:600;">LAYOVER LEGENDS</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#F7F3EC;">How was your Amsterdam experience?</h1>
            <p style="margin:0 0 6px;font-size:13px;color:rgba(247,243,236,0.50);">Booking ref: ${data.bookingRef}</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:rgba(247,243,236,0.75);">
              Hi ${data.userName},<br/><br/>
              We hope you loved your <strong style="color:#F7F3EC;">${data.tourName}</strong> yesterday!
              It would mean the world to us if you could spare 2 minutes to share what you thought.
              Your honest review helps future travelers decide, and helps us improve.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#C9963A;border-radius:50px;padding:14px 32px;">
                  <a href="${data.reviewUrl}" style="color:#0D0D0D;text-decoration:none;font-weight:700;font-size:15px;">
                    Leave a review →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:rgba(247,243,236,0.40);">
              This link is personal to you and expires in 30 days.
              You only need to click once — no account password required.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(247,243,236,0.08);font-size:12px;color:rgba(247,243,236,0.35);">
            Layover Legends · Amsterdam ·
            <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://layover-legends.com"}/legal/privacy"
              style="color:rgba(247,243,236,0.35);">Privacy Policy</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
