---
description: Session-start ritual — sync state, confirm priorities
---

# Session start

Before doing anything, run through this in under 2 minutes:

## 1. Sync state

```bash
git status                    # any uncommitted local changes?
git log --oneline -5          # what was the last work?
git fetch && git status       # are we behind origin?
```

## 2. Read the room

- Re-read `CLAUDE.md` headers (table of contents level)
- Skim recent commits: `git log --oneline -10`
- Check Vercel deployment status:
  `https://vercel.com/layover-legends-1887s-projects/layoveramsterdam/deployments`
  - Latest deploy green? If not, that's priority zero.

## 3. Confirm what we're shipping today

Ask the user (or restate to confirm):
- What's the goal of this session?
- Is it a new feature, a fix, a migration, a polish pass?
- What's "done" look like?

## 4. Pick the right slash command

Match the goal to the right command:
- **Building something new** → `/feature`
- **Schema change** → `/migrate`
- **Admin surface** → `/admin-page`
- **Reviewing pending changes** → `/review`
- **Pre-deploy** → `/deploy`
- **Performance / scale concern** → `/scale`
- **Security concern** → `/security`
- **Payments** → `/stripe`
- **Bookings** → `/booking`
- **Translations** → `/i18n`
- **Email** → `/email`
- **SEO / metadata** → `/seo`

## 5. Move

Once the goal is clear, **stop discussing and start doing.** A multimillion
business gets built one shipped commit at a time, not from rounds of
clarification on what to do next.

## Anti-patterns

- "Let me first re-read the entire codebase" — read what's relevant; the
  codebase is large enough that a full read wastes the session.
- "Let me ask 5 clarifying questions" — pick the most important one and
  proceed on reasonable assumptions for the rest.
- "Let me write a 500-line plan" — short bullet plan, then ship.
