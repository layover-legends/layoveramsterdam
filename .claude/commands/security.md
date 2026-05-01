---
description: Security audit — RLS, secrets, inputs, auth surface
---

# Security audit: $ARGUMENTS

Public-facing platform handling user PII (name, email, phone, nationality)
and soon payments. **Treat security as table stakes, not a feature.**

## Auth surface

- [ ] Every `/admin/**` page wrapped in `requireAdmin()` server-side
- [ ] Every server action that mutates protected data calls
      `requireAdmin()` or verifies session ownership before any DB write
- [ ] `app/auth/signout/route.ts` returns 303 so browsers re-issue as GET
- [ ] No JWT/secret echoed in the page source; check the JS bundle if
      uncertain
- [ ] Sign-in flow uses `redirectTo: ${origin}/auth/callback` — don't
      accept arbitrary redirect URIs from the URL

## RLS

- [ ] Every public table has `ROW LEVEL SECURITY ENABLED`
- [ ] Every public table has at least one policy. RLS-on with no policy
      = blocked everything (a bug, not a security feature)
- [ ] Policies use `SECURITY DEFINER` helpers (`public.is_admin(uuid)`)
      to avoid policy recursion
- [ ] No policy uses `auth.role() = 'authenticated'` as the only check —
      that lets every signed-in user touch every row
- [ ] `service_role` key never reachable from the client bundle

## Secrets

- [ ] All env vars live in Vercel + `.env.local`. **Nothing in `.env*`
      is committed.** Run `git ls-files | grep -E '\.env'` — should be empty.
- [ ] `NEXT_PUBLIC_*` vars are intentionally public (anon key, mapbox
      token, supabase URL). Service-role key, Resend key, Stripe secret
      key are never `NEXT_PUBLIC_*`.
- [ ] In Vercel, the Sensitive flag is OFF for `NEXT_PUBLIC_*` (else
      client bundle won't see them) and ON for everything else.

## Input validation

- [ ] Every Server Action validates input server-side (length, format,
      enum membership, range). The form's `required` attribute is for UX,
      not security.
- [ ] String inputs have explicit max length (use `maxLength={…}`
      client-side AND check on the server)
- [ ] Numeric inputs bounded (`min`/`max` checked on the server)
- [ ] URL inputs validated against `^https?://`
- [ ] File uploads check MIME type + max size (current cap: 5 MB)
- [ ] Slugs/identifiers validated against `^[a-z0-9-]+$`

## Injection

- [ ] No string-concatenated SQL (we use Supabase client; if we ever
      reach for `rpc` or raw SQL, parameterise)
- [ ] No `dangerouslySetInnerHTML` without an HTML sanitizer
- [ ] Search inputs that flow into PostgREST `or()` filters URL-encode
      the user input (otherwise `,` injects new conditions)

## CSRF / state

- [ ] Server actions use the built-in Next.js CSRF protections (we are,
      by default). Don't disable.
- [ ] Sign-out is a POST (not GET) so it can't be triggered via image src.

## Storage

- [ ] Bucket policies: `assets/stops/*` is public-read but admin-only
      write
- [ ] Filenames don't reflect raw user input (we use `<id>/<timestamp>`).
      No `path traversal` like `../../etc/passwd`.

## Privacy / GDPR

- [ ] User can edit their own profile (yes, `/account`)
- [ ] User can request deletion: when implemented, FK CASCADE on `users`
      handles the data; document the email-template reply
- [ ] `marketing_opt_in` respected before sending broadcast emails
- [ ] Cookies set: only what's needed for auth (Supabase handles this)

## Headers

- [ ] CSP — eventually we want a strict CSP. For now, document deviations.
- [ ] HSTS — Vercel handles this for our domains.

## External services

- [ ] Mapbox token domain-restricted (in Mapbox dashboard) to our
      production + preview domains
- [ ] Stripe (when wired): webhook secret verified on every event;
      use idempotency keys on charge creation; never log full card data
- [ ] Resend: SPF / DKIM / DMARC verified for `layover-legends.com`
      (already done)

## Output format

```
## 🟢 Secure
- (controls in place)

## 🔴 Critical — fix immediately
1. <surface> — <vulnerability> — <fix>
2. …

## 🟡 Strengthen
- (controls that exist but could be tighter)
```

Treat any **🔴** finding as a stop-the-world. Don't ship new features
until the list is empty.
