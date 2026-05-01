---
description: Implement a complete vertical-slice feature end-to-end (DB → server → UI → tests)
---

# Implement a feature: $ARGUMENTS

You're shipping a production-ready slice of new functionality. Follow this
sequence, **never skip a step**, and stop to ask if anything is ambiguous.

## 1. Understand & scope

- Restate the feature in one sentence.
- List the user stories ("As an X, I want to Y so I can Z").
- Identify which existing tables / pages / components this touches. Search
  the schema (`information_schema.tables` in Supabase) and the codebase
  before assuming new tables / files are needed — see `CLAUDE.md` for the
  enterprise schema. **Reuse before you create.**

## 2. Data layer

- Sketch the database changes (new columns, indexes, FKs, RLS policies).
- Write an idempotent migration in `supabase/migrations/<descriptive>.sql`:
  - `CREATE … IF NOT EXISTS`
  - RLS on with at least one SELECT policy (admins write, public reads
    where appropriate)
  - `ON CONFLICT DO NOTHING` for seeds
  - Sanity SELECT at the bottom showing the result
- Note: migrations run manually in Supabase Studio's SQL Editor.

## 3. Server layer

- New TypeScript types: client-safe types in a `*-types.ts` file
  (no server imports), server-only queries in the matching `*.ts`.
- Re-export types from the server file so existing callers keep working.
- Server Actions for mutations in `app/<route>/actions.ts`:
  - First line: `"use server";`
  - First call: `await requireAdmin()` if admin-only.
  - Server-side input validation — never trust the form.
  - On success: `revalidatePath()` for every page that displays this data,
    then `redirect()` with `?saved=1`.
  - On error: `redirect()` with `?error=<message>`.

## 4. UI layer

- Server components by default. Reach for `"use client"` only when you
  truly need a hook, browser API, or event handler.
- Tailwind brand tokens: `brand-navy`, `brand-cream`, `brand-orange`.
- Mobile-first; test 380px width.
- Keyboard accessible — labels on every input, real `<button type="submit">`.
- Use `useFormStatus()` for pending states on buttons inside server-action forms.

## 5. Wire-up

- Add a sidebar / nav entry if appropriate.
- Update `lib/public/*.ts` if the public homepage should reflect the new data.
- Update `CLAUDE.md` if you introduced new conventions or tables.

## 6. Verify

- `npm run build` locally OR push to a Vercel preview branch.
- Manually exercise the success path AND at least two error paths.
- Confirm the homepage / admin teaser updates after a write
  (revalidation worked).

## 7. Ship

- Single commit per logical step. Commit message format:
  `feat(scope): summary` / `fix(scope): summary`.
- Push. Watch the Vercel build.
- If the build fails, read the log line containing "Failed to compile",
  diagnose, fix, push again. Don't redeploy without a code fix.

## Red flags to push back on

- "Just hardcode it for now" — categories/options always go in a table.
- "Skip the migration, do it in Supabase Studio" — every schema change
  needs a checked-in migration file.
- "Disable RLS for this one query" — never. Add the right policy.
- "Use `any` to make TS happy" — fix the real type.

If the user asks for something that would create tech debt, surface the
trade-off in one sentence and propose the cleaner path before proceeding.
