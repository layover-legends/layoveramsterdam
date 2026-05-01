---
description: Plan and write a production-grade SQL migration for the Supabase database
---

# Database migration: $ARGUMENTS

Before writing a single line of SQL, audit the existing schema. **The schema
is enterprise-grade and pre-existing** — never duplicate a table that
already represents the same concept.

## 1. Inventory

Run these in Supabase SQL Editor to confirm what's already there:

```sql
-- Does a similar table already exist?
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%KEYWORD%';

-- Columns of an existing candidate
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'CANDIDATE_TABLE'
ORDER BY ordinal_position;

-- Foreign keys reaching into / out of it
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.CANDIDATE_TABLE'::regclass;

-- RLS state and policies
SELECT relrowsecurity FROM pg_class WHERE oid = 'public.CANDIDATE_TABLE'::regclass;
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'CANDIDATE_TABLE';
```

If a fitting table exists, **extend it** (add columns, add policies). Only
create a new table when the concept is genuinely new.

## 2. Migration file

Filename: `supabase/migrations/<descriptive-kebab-case>.sql`

Top of the file:

```sql
-- =========================================================================
-- <One-line purpose>
-- Run once in Supabase SQL Editor. Idempotent: safe to re-run.
-- =========================================================================
```

## 3. Idempotency rules

- `CREATE TABLE IF NOT EXISTS …`
- `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`
- `CREATE INDEX IF NOT EXISTS …`
- `INSERT … ON CONFLICT (…) DO NOTHING`
- For triggers: `DROP TRIGGER IF EXISTS … ; CREATE TRIGGER …`
- For RLS policies: wrap in `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '…') THEN CREATE POLICY … END IF; END $$;`
- For enum types: `DO $$ BEGIN CREATE TYPE … ; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`

## 4. Required pieces for any new table

- **PK**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- **FKs**: `REFERENCES public.parent(id) ON DELETE CASCADE` (or `RESTRICT` if loss is unacceptable)
- **Audit**: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` + a `BEFORE UPDATE`
  trigger that calls `public.set_updated_at()` (already defined in the schema)
- **Indexes** on every column you'll filter / order by
- **RLS**: `ALTER TABLE … ENABLE ROW LEVEL SECURITY` AND at least one
  policy. Empty RLS = blocked everything.

## 5. Standard policy patterns

```sql
-- Public read of active rows
CREATE POLICY "Public reads active <thing>" ON public.<table>
  FOR SELECT USING (is_active = TRUE);

-- Each user reads/updates their own row
CREATE POLICY "Users see own <thing>" ON public.<table>
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own <thing>" ON public.<table>
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins do everything
CREATE POLICY "Admins manage <thing>" ON public.<table>
  FOR ALL USING (public.is_admin(auth.uid()))
          WITH CHECK (public.is_admin(auth.uid()));
```

## 6. Bottom of every migration

```sql
-- Sanity check (optional; helpful when running manually)
SELECT count(*) AS rows, true AS migration_ok FROM public.<table>;
```

## 7. After running

- Verify the sanity SELECT shows expected counts.
- Add the SQL file to git and commit alongside the related app code:
  `git add supabase/migrations/<file>.sql && git commit -m "db(<scope>): <summary>"`.

## Anti-patterns — push back on these

- "We don't need RLS, it's just admin data" → No. RLS is defense-in-depth.
- "Add a column with `ALTER TABLE … ADD COLUMN x TEXT NOT NULL DEFAULT ''`"
  on a big table → Use `ADD COLUMN x TEXT` first, backfill, then `SET NOT NULL`.
- "Drop and recreate the table" → never on production data. Use ALTER paths.
- "Skip the migration file, just run SQL in Studio" → every schema change
  must be a checked-in file in `supabase/migrations/`.
