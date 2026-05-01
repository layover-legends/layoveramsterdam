-- =========================================================================
-- Articles table — long-form SEO content (blog).
--
-- Owns the keyword "what to do during a [N]-hour layover in Amsterdam" and
-- variations. Every published article gets its own /blog/[slug] page with
-- proper meta_title and meta_description, and is included in the sitemap.
--
-- Idempotent: safe to re-run.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.articles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  excerpt          TEXT,
  body_md          TEXT NOT NULL,
  cover_url        TEXT,
  meta_title       TEXT,
  meta_description TEXT,
  is_published     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at     TIMESTAMPTZ,
  author_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Length caps that match Google's thresholds.
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_title_len,
  ADD CONSTRAINT articles_title_len
    CHECK (char_length(title) BETWEEN 1 AND 200),
  DROP CONSTRAINT IF EXISTS articles_meta_title_len,
  ADD CONSTRAINT articles_meta_title_len
    CHECK (meta_title IS NULL OR char_length(meta_title) <= 70),
  DROP CONSTRAINT IF EXISTS articles_meta_description_len,
  ADD CONSTRAINT articles_meta_description_len
    CHECK (meta_description IS NULL OR char_length(meta_description) <= 160),
  DROP CONSTRAINT IF EXISTS articles_excerpt_len,
  ADD CONSTRAINT articles_excerpt_len
    CHECK (excerpt IS NULL OR char_length(excerpt) <= 280);

-- Read-path indexes.
CREATE INDEX IF NOT EXISTS idx_articles_slug         ON public.articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_published    ON public.articles (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author       ON public.articles (author_id);

-- updated_at trigger (only attaches if the helper exists).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_articles_updated_at ON public.articles;
    CREATE TRIGGER set_articles_updated_at
      BEFORE UPDATE ON public.articles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS — public reads published only; admins manage everything.
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'articles'
       AND policyname = 'Public reads published articles'
  ) THEN
    CREATE POLICY "Public reads published articles" ON public.articles
      FOR SELECT USING (is_published = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'articles'
       AND policyname = 'Admins read articles'
  ) THEN
    CREATE POLICY "Admins read articles" ON public.articles
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'articles'
       AND policyname = 'Admins insert articles'
  ) THEN
    CREATE POLICY "Admins insert articles" ON public.articles
      FOR INSERT
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'articles'
       AND policyname = 'Admins update articles'
  ) THEN
    CREATE POLICY "Admins update articles" ON public.articles
      FOR UPDATE
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'articles'
       AND policyname = 'Admins delete articles'
  ) THEN
    CREATE POLICY "Admins delete articles" ON public.articles
      FOR DELETE
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sanity check.
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'articles') AS columns_present,
  (SELECT COUNT(*) FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'articles')   AS policies_present,
  (SELECT COUNT(*) FROM public.articles)                       AS row_count;
-- Expect: columns_present >= 13, policies_present = 5, row_count = 0
