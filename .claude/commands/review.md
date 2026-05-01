---
description: Production-readiness review of pending changes
---

# Production-readiness review: $ARGUMENTS

You are a senior reviewer with full responsibility for production. Be
ruthless. We are scaling toward millions of users and a multimillion-euro
business — sloppy work compounds into outages and security incidents.

Run through this checklist top to bottom. For each section, **either confirm
green or call out exactly what to fix.** Don't write code unless asked; the
output is a punch-list.

## 1. Security

- [ ] Every `/admin/*` page calls `requireAdmin()` server-side
- [ ] RLS is enabled on every new public table, with the correct
      SELECT/INSERT/UPDATE/DELETE policies
- [ ] No service-role key reaches the client bundle (search the JS bundle
      for `service_role` if uncertain)
- [ ] All user inputs validated server-side (length, type, range, regex)
- [ ] No SQL string concatenation that lets in injection
- [ ] No env vars marked "Sensitive" in Vercel that need to be
      `NEXT_PUBLIC_*` (Sensitive prevents client-side inlining)
- [ ] No `dangerouslySetInnerHTML` without sanitisation

## 2. Data integrity

- [ ] Foreign keys with `ON DELETE` behavior chosen consciously
      (CASCADE for owned children, RESTRICT for shared references)
- [ ] Unique constraints on natural keys (slug, email, …)
- [ ] Indexes on every column we filter/sort/join by
- [ ] `updated_at` auto-managed via `set_updated_at()` trigger
- [ ] Migrations idempotent (`IF NOT EXISTS`, `ON CONFLICT`, wrapped policies)

## 3. Type safety

- [ ] No `any` (look for `: any` or `as any`)
- [ ] No type assertions hiding real errors
- [ ] Server-only files not imported from client components — split into
      `*-types.ts` companions where needed
- [ ] Supabase query results narrowed to typed shapes (cast at the boundary)

## 4. Server actions & data flow

- [ ] First line of every action file: `"use server";`
- [ ] Auth/admin gate before any DB access
- [ ] `revalidatePath()` after every write so UI reflects new state
- [ ] Errors redirected with `?error=…` so the user sees something useful
- [ ] `redirect()` is the last call in success paths (no code after it)

## 5. UI

- [ ] Mobile-first verified at ~380px viewport
- [ ] Brand tokens used consistently (`brand-navy`/`brand-cream`/`brand-orange`)
- [ ] Form fields have associated `<label htmlFor>`
- [ ] Submit buttons reflect pending state via `useFormStatus()`
- [ ] Error and success states styled, not raw text
- [ ] Native `<select>` options have inline dark styling for cross-browser

## 6. Performance

- [ ] Heavy/optional client deps lazy-loaded with `next/dynamic`
- [ ] Image components use proper `sizes` and `priority` flags
- [ ] No N+1 queries (one round-trip per logical read; use joins)
- [ ] Pagination on any list that can grow past a few hundred rows
- [ ] No client component fetching data that a server component could fetch

## 7. Internationalisation readiness

- [ ] No hardcoded user-facing English in components — at least keep strings
      pluckable for later i18n (single-string consts, no string concatenation)
- [ ] Numbers/dates use `toLocaleDateString` / `Intl.NumberFormat`

## 8. SEO & metadata

- [ ] Public pages export `metadata` with `title`, `description`, `openGraph`
- [ ] Headings have a logical h1 → h2 → h3 order
- [ ] Important links use `<Link>` (Next) not `<a>` (loses prefetch)

## 9. Observability

- [ ] Server actions log errors that aren't user-facing (so we can debug prod)
- [ ] Long-running queries indexed; check `EXPLAIN` if uncertain

## 10. Documentation

- [ ] `CLAUDE.md` updated if the change introduces a new convention or table
- [ ] Migration file has a header comment explaining the purpose
- [ ] Commit message uses `feat(scope):` / `fix(scope):` / `db(scope):`

## Output format

Write the review as:

```
## ✅ Green
- (concise list of things that pass)

## ⚠️  Fix before merge
1. <file>:<line> — <issue> — <one-line fix>
2. …

## 💡 Nice-to-have
- <improvements that aren't blockers>
```

If anything in the diff would compound into tech debt at scale, flag it
loudly in "Fix before merge" even if it currently works.
