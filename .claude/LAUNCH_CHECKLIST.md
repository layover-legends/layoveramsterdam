# Layover Legends — Launch Runbook

**Audience:** Steven Dupont, founder. Use this before, during, and after the
first paying customer arrives.

**Last updated:** Pre-launch (Phase 9d.2 verified live).

---

## T-minus week — pre-launch readiness

### Code & infra
- [x] Phase 9a security headers (CSP, HSTS preload, COOP/CORP, X-Frame DENY)
- [x] Phase 9b GDPR (cookie banner, account deletion, 18+ DOB verification, audit_logs)
- [x] Phase 9c operations command center (admin staff/vehicles/roster/compliance/playbook)
- [x] Phase 9c driver PWA (installable, offline-capable, push notifications, SOS button)
- [x] Phase 9d trust + content (FAQ, Contact, About, Reviews with verified-purchase RLS, Multi-currency)
- [x] Phase 9d.1 Asset Library DAM (smart-crop, focal point, photo_usage tracking)
- [x] Phase 9d.2 polish pass (title de-dup, FAQ aria, conditional aggregateRating, removed fake "4.9★")
- [x] CAA DNS records (letsencrypt + pki.goog only, blocks rogue cert issuance)
- [x] HSTS preload eligible (max-age=63072000, includeSubDomains, preload)
- [x] Verified-purchase reviews RLS (DB-level, attack-tested)
- [x] All admin mutations write to audit_logs

### User-side actions still pending
- [ ] **Sign up for Sentry** (https://sentry.io, GitHub SSO, free)
  - Add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to Vercel env
  - Hand phase9d.3-sentry-integration.md to Claude Code
- [ ] **Sign up for Better Stack** (https://betterstack.com/uptime, free tier)
  - Create monitor: HTTPS, every 3 min, https://layover-legends.com/
  - Optionally add `/api/health` if Claude Code re-adds it as a daily-only ping
  - Set alert email to travellayoverlegends@gmail.com
- [ ] **KvK registration** (Dutch eenmanszaak)
  - Once received, fill into `/admin/settings` → `kvk_number` + `vat_number`
- [ ] **Real founder photo** for /about page
- [ ] **Vehicle commercial insurance** in place
- [ ] **Public liability insurance** in place
- [ ] **Backfill photo_usage** once first photo lands:
  ```powershell
  node --env-file=.env.local --import tsx scripts/backfill-photo-usage.ts
  ```

### Pre-launch testing (do these before announcing the site)

**Walk the booking flow yourself, in production, with a real test card:**
1. Visit https://layover-legends.com from a private/incognito window
2. Click "Find Tours" with realistic flight numbers (KLM 1234, AF 567)
3. Pick AI Sprint or Classic Tour
4. Complete checkout with Stripe test card `4242 4242 4242 4242` (test mode)
5. Verify Resend confirmation email arrives within 60 seconds
6. Verify booking shows in /admin/bookings
7. Verify booking appears in /admin/roster/today
8. From admin, mark booking as "completed"
9. Verify the post-tour review request email fires after the +24h cron
10. Click the review email link, submit a 5-star review
11. Verify review appears in /admin/reviews moderation queue
12. Approve the review
13. Verify the review appears on the tour page
14. Verify schema.org rich snippet via https://search.google.com/test/rich-results

**A note on Stripe:** confirm Stripe is in TEST MODE for these walkthroughs.
Switch to LIVE only once flow is bulletproof. Live key change requires Vercel
env update + redeploy.

**Email deliverability**:
- Send a test booking-confirmation to a Gmail, Outlook, AND iCloud address
- Verify arrival in inbox (not spam) on all three
- Verify rendering: links work, brand colors load, no broken images
- If any go to spam: check Resend dashboard → confirm SPF + DKIM + DMARC pass

---

## T-minus 24 hours

- [ ] Confirm all envs in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `RESEND_API_KEY`, `MAPBOX_TOKEN`, `DEEPL_API_KEY`, all VAPID keys, all
      Turnstile keys, Sentry keys
- [ ] Verify SSL Labs grade A+ (https://www.ssllabs.com/ssltest/analyze.html?d=layover-legends.com)
- [ ] Run Google Rich Results test on:
  - https://layover-legends.com/ (Organization + LocalBusiness)
  - https://layover-legends.com/faq (FAQPage)
  - https://layover-legends.com/tours/ai-sprint (TouristTrip + BreadcrumbList)
- [ ] Verify Stripe webhook endpoint health in Stripe dashboard
- [ ] Verify Supabase project not paused (free tier pauses after 1 week of inactivity)
- [ ] Backup current production schema:
  ```sql
  -- Run in Supabase SQL Editor, save output:
  pg_dump --schema-only --schema=public
  ```

---

## Day-of launch — first 4 hours

### Monitoring dashboard (open in tabs)
1. Vercel deployment logs: https://vercel.com/layover-legends-1887s-projects/layoveramsterdam/logs
2. Sentry: https://sentry.io/organizations/{your-org}/issues/?project={layover-legends}
3. Better Stack uptime status
4. Stripe payments live feed: https://dashboard.stripe.com/payments
5. Resend logs: https://resend.com/emails
6. Supabase auth logs: https://supabase.com/dashboard/project/idgobxvhbhdymfsfmhae/auth/users
7. /admin dashboard: https://layover-legends.com/admin

### Watch for these specific failures
- **Stripe webhook 500s** → run-time error, customer paid but booking stuck
- **Resend bounces** → confirmation emails not delivering
- **Supabase rate limit warnings** → Hobby tier has limits, scale up if hit
- **Vercel function timeouts** → 10s on Hobby; long Stripe calls might exceed

### If a real customer hits a bug mid-booking
1. **Don't panic.** Send them a personal email from travellayoverlegends@gmail.com
2. Apologize, offer to manually create the booking, comp them an upgrade
3. Add booking via /admin/bookings → manual create
4. Mark for follow-up: "{booking_id} — bug context: ..."
5. File the bug as a /admin/support ticket OR Sentry issue

### Communication to customer for any issue
> "Hi [name], thank you for booking with Layover Legends. I noticed an
> issue with your booking and want to make sure everything is sorted.
> [Specific fix]. As an apology, I'd like to offer [comp]. Looking forward
> to making your Amsterdam layover unforgettable. — Steven"

---

## First-week post-launch

### Daily review (10 min)
- [ ] Check Sentry: any new errors? Triage by frequency, not severity
- [ ] Check Better Stack: any uptime dips? Pattern? Time-of-day?
- [ ] Check Stripe: any failed payments? Refund requests? Disputes?
- [ ] Check Resend: any bounces? Deliverability rate?
- [ ] Check /admin/bookings: anything stuck in 'paid' but not 'confirmed'?
- [ ] Check /admin/contact: respond within 4 hours per your SLA promise

### Weekly review (30 min)
- [ ] Cron health: did fx-rates fire daily? Review-requests fire daily?
      Photo-orphan-gc fire weekly?
- [ ] Compliance dashboard /admin/compliance: any expiry alerts?
- [ ] Per-tour P&L: which tours actually making money vs looking good?
- [ ] Customer LTV trends: lifetime_revenue_cents on top customers
- [ ] Reviews: what's the avg sentiment? Any flagged for moderation?

### Decisions to revisit after week 1
- Phase 9e (marketing infra) vs Phase 9f (customer ops) — which hurts more?
- Vercel Pro upgrade ($20/mo) — needed if hitting build-minute limits or
  needing hourly review-request cron back
- Better Stack paid tier ($10/mo) — needed if uptime monitoring at 3-min
  resolution insufficient (free is 3-min on Hobby)

---

## Incident response — when production is broken

### Severity levels

**SEV1 — site is down / can't book / payments failing**
- Acknowledge: post a note on Instagram/email auto-responder ("we're aware")
- Investigate: Sentry first (90% of bugs surface there), then Vercel logs,
  then Supabase logs
- Mitigate: roll back the latest deploy if it correlates with the breakage:
  ```
  # Vercel UI → Deployments → previous Ready → ... → Promote to Production
  ```
- Resolve: fix root cause, ship a new deploy
- Postmortem: write up what broke + what to add to this checklist

**SEV2 — feature broken but core flow works**
(e.g. /faq won't load, currency picker stuck, review submission errors)
- Acknowledge in /admin internal notes
- Fix in next 24 hours (push fix + verify)
- No customer comms needed unless customer reports it directly

**SEV3 — minor visual / cosmetic / typo**
- Add to next batch fix
- Track in /admin internal todo or open a GitHub issue

### Rollback procedure
1. Vercel UI → Deployments → find last Green production deployment
2. Click `…` → **Promote to Production**
3. Site reverts within 30 seconds (no rebuild)
4. **Important:** code on `main` branch is now AHEAD of what's deployed.
   Either revert the bad commit, or push a hotfix on top.

```bash
# Hotfix pattern
git revert <bad-commit-sha>
git push
# Vercel auto-deploys the revert
```

### Database rollback
**There is no transactional database rollback.** Migrations are forward-only.
If a migration causes data corruption:
- Stop accepting writes (set Vercel maintenance flag: env var `MAINTENANCE_MODE=true`,
  middleware returns 503 to non-admin paths)
- Use Supabase point-in-time recovery (PITR — Pro plan only) OR restore
  from your last backup
- File a postmortem; add a "test on staging branch first" rule

---

## Contacts & escalation

| Service | URL | Account | Notes |
|---|---|---|---|
| Vercel | vercel.com/layover-legends-1887s-projects | layover-legends-1887s | Hobby plan — watch quotas |
| Supabase | supabase.com/dashboard/project/idgobxvhbhdymfsfmhae | travellayoverlegends@gmail.com | Free tier, pauses after 7d inactivity |
| Stripe | dashboard.stripe.com | travellayoverlegends@gmail.com | Test+Live keys separately scoped |
| Resend | resend.com | travellayoverlegends@gmail.com | Free 3k emails/mo |
| Mapbox | account.mapbox.com | travellayoverlegends@gmail.com | Free 50k loads/mo |
| Cloudflare | dash.cloudflare.com | travellayoverlegends@gmail.com | DNS only, not proxied |
| GitHub | github.com/layover-legends/layoveramsterdam | layover-legends org | Repo access via SSH key |
| DeepL | deepl.com/account | travellayoverlegends@gmail.com | Free 500k chars/mo |

### Emergency rollback contacts
- **Yourself:** the only on-call. Phone always on.
- **Critical second pair of eyes:** none currently. After launch, identify ONE
  trusted technical friend who can read this checklist + execute a rollback if
  you're unavailable. Brief them on Vercel + Supabase access (read-only OAuth).

---

## Notes from real launches (write your own as you go)

(Empty — fill in after first 30 days of real traffic with actual lessons.
Common lessons that surface: which tours get cancelled most, what time of day
booking conversion peaks, which language locale brings highest LTV, what
Schiphol disruptions affect bookings, etc.)
