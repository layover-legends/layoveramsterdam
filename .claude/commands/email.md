---
description: Send transactional email or build a broadcast (Resend)
---

# Email: $ARGUMENTS

We use Resend. DNS already verified for `layover-legends.com`. There's an
`email_templates` table for content and `email_logs` for delivery records.

## Server module

```ts
// lib/email/resend.ts (server-only)
import { Resend } from "resend";

let _resend: Resend | null = null;
export function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY missing");
    _resend = new Resend(key);
  }
  return _resend;
}

export const FROM = "Layover Amsterdam <hello@layover-legends.com>";
```

## Send a transactional email

```ts
import { resend, FROM } from "@/lib/email/resend";

await resend().emails.send({
  from: FROM,
  to: user.email,
  subject: "Your Layover Amsterdam tour is confirmed",
  react: <BookingConfirmation booking={booking} />,
  // OR: html: "<…>" / text: "…"
  headers: { "X-Entity-Ref-ID": booking.id }, // for support lookups
});

// Log the send
await supabase.from("email_logs").insert({
  template_id: tplId,
  recipient_email: user.email,
  subject: "Your Layover Amsterdam tour is confirmed",
  status: "sent",
});
```

## Broadcast to the early-access list

- Filter: `users WHERE marketing_opt_in = true AND is_active`
- Process in batches of 100 (Resend rate limits)
- For every send, write a row to `email_logs`
- Include an `unsubscribe` link that sets `marketing_opt_in = false`

## Email design rules

- Inline CSS only (or use a library that inlines for you, like
  `@react-email/render`)
- Width 600px max
- Always include a plain-text version
- Branding: navy header, cream body, orange CTA button
- Test on Gmail mobile + Apple Mail before sending to anyone real

## Hard rules

- **Never send marketing email to users with `marketing_opt_in = false`.**
- **Always honor unsubscribe within 24h.** GDPR / CAN-SPAM.
- **Never put PII in subject lines** (subjects are stored in many places).
- For confirmation emails, include the booking ID so support can find the
  record without asking the customer.
- Bounce / complaint webhooks should flip the user's `is_active` to false
  on hard bounces to protect sender reputation.
