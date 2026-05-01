---
description: Pre-deploy checklist + push + watch the Vercel build
---

# Deploy: $ARGUMENTS

Vercel auto-builds on push to `main`. The discipline is in **what we ship
and how we verify it landed**.

## 1. Pre-flight (in VS Code terminal)

```bash
git status                    # what's about to ship?
git diff --stat               # quick scan of file impact
```

If anything in `git status` looks unexpected (untracked files you didn't
mean to add, env files, etc.) — stop and triage.

## 2. Build sanity (optional but encouraged on big changes)

```bash
npm run build                 # catch type / compile errors locally
```

If it fails locally, fix locally — never push hoping Vercel will compile
faster than your machine.

## 3. Migrations first

If the change includes a `supabase/migrations/*.sql` file:
1. Open `https://supabase.com/dashboard/project/idgobxvhbhdymfsfmhae/sql/new`
2. Paste the migration contents and run.
3. Verify the sanity SELECT at the bottom returns the expected counts.
4. **Then** push the code. Code that depends on a missing column will
   crash production.

## 4. Commit

One commit per logical change. Format:

```
feat(scope): one-line summary

(body — optional, what + why if non-obvious)
```

Scopes we use: `home`, `admin`, `account`, `auth`, `db`, `ui`, `seo`,
`stops`, `tours`, `users`, `email`.

```bash
git add <specific files>      # avoid `git add -A` unless reviewing first
git commit -m "feat(scope): summary"
```

## 5. Push

```bash
git push
```

## 6. Watch the build

`https://vercel.com/layover-legends-1887s-projects/layoveramsterdam/deployments`

Click the latest deployment. If it goes red:

- Click into the deployment → scroll to the build log → find the
  "Failed to compile" or "Module not found" line. Fix that single error,
  push again. Don't redeploy without a code change.
- Common offenders we've already hit:
  - Server-only file imported from a `"use client"` component
    → split into a `*-types.ts` companion.
  - `"use server";` placed inside a function instead of at file top
    → move it to line 1.
  - Missing component file in the commit → `git status`, add the file,
    commit, push.

## 7. Verify the live site

- Public homepage loads, sign-in flow works, StopsTeaser shows fresh data
- `/account` shows the authenticated user's data
- `/admin` (admin user only) shows fresh metrics
- New feature path exercised at least once

## 8. Roll back if needed

If a deploy goes wrong and the prod site is broken:

1. Vercel → Deployments → find the last green deploy
2. `…` → **Promote to Production**
3. Investigate, fix on a branch, test, re-deploy

Never patch prod with a force-push to `main` — always go through a fresh
commit so the history stays clean.

## Hard rules

- **Never push a `main` commit without reading `git diff` first.**
- **Never commit a `.env*` file.** If one shows up in `git status`, add it
  to `.gitignore` immediately.
- **Never run a destructive SQL on prod without showing the count first.**
  `SELECT count(*) FROM x WHERE …` before `DELETE FROM x WHERE …`.
